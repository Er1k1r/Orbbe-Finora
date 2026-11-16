import { ehMovimentoInterno, ehPagamentoParcela } from './fluxo'
import { mesDe } from './meses'
import { trilhaFinanciamento } from './painel'
import { previstosDoMes } from './recorrencia'
import type { Centavos, Financiamento, Lancamento, Mes, TipoLancamento } from './tipos'

export type SituacaoEvento = 'pago' | 'aberto' | 'vencido'
export interface EventoDia {
  id: string
  data: string // 'YYYY-MM-DD'
  nome: string
  valor: Centavos
  tipo: TipoLancamento
  situacao: SituacaoEvento
  origem: 'lancamento' | 'previsto' | 'parcela'
  lancamento?: Lancamento
}

const situacao = (pago: boolean, data: string, hoje: string): SituacaoEvento => (pago ? 'pago' : data < hoje ? 'vencido' : 'aberto')

/**
 * O que acontece em cada dia de `mes` para a folhinha: lançamentos (menos transferências e ajustes), previstos da
 * recorrência e parcelas de contrato no dia do vencimento. O pagamento de parcela lançado não aparece à parte: a
 * parcela do contrato já é a casa daquele compromisso (antecipação aparece pelo lançamento).
 */
export function eventosDoMes(
  lancs: Lancamento[], financiamentos: Financiamento[], mes: Mes, hoje: string, nomeCategoria: (id: string) => string,
): EventoDia[] {
  const ids = new Set(financiamentos.map((f) => f.id))
  const eventos: EventoDia[] = []
  for (const l of lancs) {
    if (mesDe(l.data) !== mes || ehMovimentoInterno(l)) continue
    if (ehPagamentoParcela(l, ids) && l.pagamentoFinanciamento !== 'antecipacao') continue
    const fin = financiamentos.find((f) => f.id === l.financiamentoId)
    eventos.push({
      id: l.id, data: l.data, valor: l.valor, tipo: l.tipo, origem: 'lancamento', lancamento: l,
      nome: l.descricao ?? (fin ? `Antecipação ${fin.nome}` : nomeCategoria(l.categoriaId)),
      situacao: situacao(l.status === 'pago', l.data, hoje),
    })
  }
  for (const l of previstosDoMes(lancs, mes)) {
    eventos.push({
      id: l.id, data: l.data, valor: l.valor, tipo: l.tipo, origem: 'previsto',
      nome: l.descricao ?? nomeCategoria(l.categoriaId), situacao: situacao(false, l.data, hoje),
    })
  }
  for (const f of financiamentos) {
    const dia = f.primeiraParcela.slice(8)
    for (const p of trilhaFinanciamento(f, lancs, hoje)) {
      if (p.mes !== mes) continue
      const ultimo = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5)), 0).getDate()
      const data = `${mes}-${String(Math.min(Number(dia), ultimo)).padStart(2, '0')}`
      eventos.push({
        id: `${f.id}#${p.numero}`, data, valor: p.valor, tipo: 'saida', origem: 'parcela',
        nome: `${f.nome} ${p.numero}/${f.totalParcelas}`, situacao: situacao(p.situacao === 'paga', data, hoje),
      })
    }
  }
  return eventos.sort((a, b) => a.data.localeCompare(b.data) || a.nome.localeCompare(b.nome, 'pt-BR'))
}

/** Casas da folhinha (semanas de domingo a sábado), com os dias de fora do mês como `null`. */
export function casasDoMes(mes: Mes): (string | null)[] {
  const [a, m] = mes.split('-').map(Number)
  const primeiro = new Date(a, m - 1, 1).getDay()
  const dias = new Date(a, m, 0).getDate()
  const casas: (string | null)[] = Array.from({ length: primeiro }, () => null)
  for (let d = 1; d <= dias; d++) casas.push(`${mes}-${String(d).padStart(2, '0')}`)
  while (casas.length % 7 !== 0) casas.push(null)
  return casas
}

/** Os 7 dias (domingo a sábado) da semana que contém `data`. */
export function semanaDe(data: string): string[] {
  const [a, m, d] = data.split('-').map(Number)
  const base = new Date(a, m - 1, d)
  base.setDate(base.getDate() - base.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
  })
}
