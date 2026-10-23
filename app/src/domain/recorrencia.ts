import { fimDoMes, mesDe } from './meses'
import type { Lancamento, Mes } from './tipos'

function proximoMes(mes: Mes): Mes {
  const [y, m] = mes.split('-').map(Number)
  return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7)
}

export interface ResultadoRecorrencia {
  /** Novos lançamentos pendentes (ids determinísticos `${modelo.id}:${mes}`). */
  copias: Lancamento[]
  /** Modelos cuja marca d'água `geradoAte` avançou (já com o campo atualizado). */
  modelos: Lancamento[]
}

/**
 * Gera as cópias mensais que faltam até o mês de `hoje`. Idempotente: meses <= `geradoAte`
 * nunca são regenerados (mesmo que o usuário tenha apagado/movido a cópia), e meses que já
 * têm cópia com o mesmo `origemId` são pulados.
 */
export function gerarRecorrentes(existentes: Lancamento[], hoje: string): ResultadoRecorrencia {
  const mesHoje = mesDe(hoje)
  const copias: Lancamento[] = []
  const modelos: Lancamento[] = []
  for (const modelo of existentes.filter((l) => l.recorrencia === 'mensal')) {
    const mesModelo = mesDe(modelo.data)
    if (mesModelo >= mesHoje) continue
    const dia = Number(modelo.data.slice(8, 10))
    const marca = modelo.geradoAte
    let mes = proximoMes(mesModelo)
    while (mes <= mesHoje) {
      const coberto = marca !== undefined && mes <= marca
      const jaExiste = existentes.some((l) => l.origemId === modelo.id && mesDe(l.data) === mes)
      if (!coberto && !jaExiste) {
        const ultimo = Number(fimDoMes(mes).slice(8, 10))
        const data = `${mes}-${String(Math.min(dia, ultimo)).padStart(2, '0')}`
        const { recorrencia: _r, geradoAte: _g, ...resto } = modelo
        copias.push({ ...resto, id: `${modelo.id}:${mes}`, data, status: 'pendente', origemId: modelo.id })
      }
      mes = proximoMes(mes)
    }
    if (marca === undefined || marca < mesHoje) modelos.push({ ...modelo, geradoAte: mesHoje })
  }
  return { copias, modelos }
}
