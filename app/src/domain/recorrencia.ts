import { fimDoMes, mesDe } from './meses'
import type { Lancamento, Mes } from './tipos'

function proximoMes(mes: Mes): Mes {
  const [y, m] = mes.split('-').map(Number)
  return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7)
}

export function gerarRecorrentes(
  existentes: Lancamento[], hoje: string, novoId: () => string,
): Lancamento[] {
  const mesHoje = mesDe(hoje)
  const novos: Lancamento[] = []
  for (const modelo of existentes.filter((l) => l.recorrencia === 'mensal')) {
    const dia = Number(modelo.data.slice(8, 10))
    let mes = proximoMes(mesDe(modelo.data))
    while (mes <= mesHoje) {
      const jaExiste = existentes.some((l) => l.origemId === modelo.id && mesDe(l.data) === mes)
      if (!jaExiste) {
        const ultimo = Number(fimDoMes(mes).slice(8, 10))
        const data = `${mes}-${String(Math.min(dia, ultimo)).padStart(2, '0')}`
        const { recorrencia: _r, ...resto } = modelo
        novos.push({ ...resto, id: novoId(), data, status: 'pendente', origemId: modelo.id })
      }
      mes = proximoMes(mes)
    }
  }
  return novos
}
