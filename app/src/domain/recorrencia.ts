import { fimDoMes, mesDe } from './meses'
import type { Lancamento, Mes, TipoLancamento } from './tipos'

function proximoMes(mes: Mes): Mes {
  const [y, m] = mes.split('-').map(Number)
  return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7)
}

/** Cópia pendente do modelo em `mes` (id determinístico `${modelo.id}:${mes}`; dia limitado ao último do mês). */
function copiaDe(modelo: Lancamento, mes: Mes): Lancamento {
  const dia = Number(modelo.data.slice(8, 10))
  const ultimo = Number(fimDoMes(mes).slice(8, 10))
  const data = `${mes}-${String(Math.min(dia, ultimo)).padStart(2, '0')}`
  const { recorrencia: _r, geradoAte: _g, recorrenciaAte: _a, ...resto } = modelo
  return { ...resto, id: `${modelo.id}:${mes}`, data, status: 'pendente', origemId: modelo.id }
}

export interface VirtualRecorrente { mes: Mes; item: Lancamento }

/**
 * Cópias que ainda NÃO existem (itens pendentes virtuais) dos modelos mensais, do mês seguinte ao do modelo
 * até `ate` (inclusive). Respeita `recorrenciaAte` e a marca d'água `geradoAte` (meses <= geradoAte contam como
 * cobertos: uma cópia apagada não ressuscita) e pula meses que já têm cópia (mesmo `origemId`).
 * Fonte única de "o que a recorrência ainda vai trazer" para resumo, custo essencial e projeção de compromissos.
 */
export function recorrentesVirtuais(modelos: Lancamento[], todos: Lancamento[], ate: Mes): VirtualRecorrente[] {
  const copiados = new Map<string, Set<Mes>>()
  for (const c of todos) {
    if (c.origemId === undefined) continue
    let meses = copiados.get(c.origemId)
    if (!meses) copiados.set(c.origemId, (meses = new Set()))
    meses.add(mesDe(c.data))
  }
  const out: VirtualRecorrente[] = []
  for (const modelo of modelos) {
    if (modelo.recorrencia !== 'mensal') continue
    for (let mes = proximoMes(mesDe(modelo.data)); mes <= ate; mes = proximoMes(mes)) {
      if (modelo.recorrenciaAte !== undefined && mes > modelo.recorrenciaAte) break
      if (modelo.geradoAte !== undefined && mes <= modelo.geradoAte) continue
      if (copiados.get(modelo.id)?.has(mes)) continue
      out.push({ mes, item: copiaDe(modelo, mes) })
    }
  }
  return out
}

/** Modelos recorrentes ativos em `mes` (mês do modelo anterior, dentro de `recorrenciaAte`) sem cópia nele e fora da marca d'água. */
export function modelosSemCopia(modelos: Lancamento[], todos: Lancamento[], mes: Mes): Lancamento[] {
  const virtuais = new Set(recorrentesVirtuais(modelos, todos, mes).filter((v) => v.mes === mes).map((v) => v.item.origemId))
  return modelos.filter((m) => virtuais.has(m.id))
}

export interface ResultadoRecorrencia {
  /** Novos lançamentos pendentes (ids determinísticos `${modelo.id}:${mes}`). */
  copias: Lancamento[]
  /** Modelos cuja marca d'água `geradoAte` avançou (já com o campo atualizado). */
  modelos: Lancamento[]
}

/**
 * Gera as cópias mensais que faltam até o mês de `hoje`. Função pura e idempotente: meses
 * <= `geradoAte` nunca são regenerados (mesmo que o usuário tenha apagado/movido a cópia),
 * meses que já têm cópia com o mesmo `origemId` são pulados e nunca se emite uma cópia cujo
 * id determinístico (`${modelo.id}:${mes}`) já exista em `existentes` — assim um `put` não
 * reverte a edição do usuário numa cópia movida, mesmo que o modelo perca o `geradoAte`.
 *
 * O que o chamador deve persistir: `modelos` (com `geradoAte` avançado) e `copias`, juntos em
 * UMA transação do Dexie (`db.transaction('rw', db.lancamentos, ...)`) com `bulkPut` — sem
 * transação, uma falha entre os dois escritos regenera cópias; os ids determinísticos tornam
 * a repetição (StrictMode, duas abas) inofensiva. Ao editar um modelo na UI, preserve o
 * `geradoAte` existente (nunca o regrave como ausente), senão a marca d'água se perde.
 */
export function gerarRecorrentes(existentes: Lancamento[], hoje: string): ResultadoRecorrencia {
  const mesHoje = mesDe(hoje)
  const idsExistentes = new Set(existentes.map((l) => l.id))
  const copias: Lancamento[] = []
  const modelos: Lancamento[] = []
  for (const modelo of existentes.filter((l) => l.recorrencia === 'mensal')) {
    const mesModelo = mesDe(modelo.data)
    if (mesModelo >= mesHoje) continue
    // A marca d'água nunca passa de recorrenciaAte: reativar a recorrência depois gera os meses que ficaram de fora.
    const alvo = modelo.recorrenciaAte !== undefined && modelo.recorrenciaAte < mesHoje ? modelo.recorrenciaAte : mesHoje
    const marca = modelo.geradoAte
    let mes = proximoMes(mesModelo)
    while (mes <= mesHoje) {
      if (modelo.recorrenciaAte !== undefined && mes > modelo.recorrenciaAte) break
      const coberto = marca !== undefined && mes <= marca
      const id = `${modelo.id}:${mes}`
      const jaExiste = existentes.some((l) => l.origemId === modelo.id && mesDe(l.data) === mes)
      if (!coberto && !jaExiste && !idsExistentes.has(id)) {
        copias.push(copiaDe(modelo, mes))
      }
      mes = proximoMes(mes)
    }
    if (marca === undefined || marca < alvo) modelos.push({ ...modelo, geradoAte: alvo })
  }
  return { copias, modelos }
}

/** Encerra a recorrência: o modelo deixa de gerar cópias após `mes` ('YYYY-MM', inclusive). */
export function cancelarRecorrencia(modelo: Lancamento, mes: Mes): Lancamento {
  return { ...modelo, recorrenciaAte: mes }
}

/**
 * Itens PREVISTOS de `mes` (cópias que a recorrência ainda vai gerar quando o mês chegar), só para exibição:
 * ids determinísticos `${modelo.id}:${mes}`, pendentes. Mesmas regras do motor (`recorrentesVirtuais`):
 * respeita `geradoAte`/`recorrenciaAte` e nunca repete uma cópia real do mês. `tipo` aplica o filtro Entradas/Saídas.
 */
export function previstosDoMes(lancs: Lancamento[], mes: Mes, tipo?: TipoLancamento): Lancamento[] {
  const modelos = lancs.filter((l) => l.recorrencia === 'mensal')
  return recorrentesVirtuais(modelos, lancs, mes).filter((v) => v.mes === mes && (tipo === undefined || v.item.tipo === tipo)).map((v) => v.item)
}
