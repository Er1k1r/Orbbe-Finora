import { estadoFinanciamento, ehMovimentoInterno, ehPagamentoParcela } from './fluxo'
import { mesDe, somarMeses } from './meses'
import { previstosDoMes } from './recorrencia'
import type { Centavos, Financiamento, Lancamento, Mes } from './tipos'

export type SituacaoParcela = 'paga' | 'atrasada' | 'a_pagar'
export interface ParcelaTrilha { numero: number; mes: Mes; valor: Centavos; situacao: SituacaoParcela }

/**
 * Uma casa por parcela do contrato: paga (inclusive as pagas antes do app e as antecipadas), atrasada (venceu em
 * mês anterior ao de `hoje` e segue em aberto) ou a pagar. É o que o painel pinta de verde e vermelho.
 */
export function trilhaFinanciamento(f: Financiamento, lancs: Lancamento[], hoje: string): ParcelaTrilha[] {
  const estado = estadoFinanciamento(f, lancs)
  const abertas = new Map(estado.restantes.map((p) => [p.numero, p]))
  return estado.cronogramaOriginal.map((p, i) => {
    const mes = mesDe(p.vencimento)
    const aberta = abertas.get(p.numero)
    if (!aberta) return { numero: p.numero, mes, valor: estado.pagas[i]?.parcela ?? p.parcela, situacao: 'paga' as const }
    return { numero: p.numero, mes, valor: aberta.parcela, situacao: mes < mesDe(hoje) ? 'atrasada' as const : 'a_pagar' as const }
  })
}

export interface PontoMes { mes: Mes; pago: Centavos; aberto: Centavos }

/**
 * Saídas de `n` meses a partir de `de`: o que já foi pago e o que está em aberto (pendentes, previstos da recorrência
 * e parcelas de contrato). Parcela de contrato vem só da trilha (nunca do lançamento vinculado, para não contar duas
 * vezes); antecipações entram pelo próprio lançamento. Transferências e ajustes ficam de fora.
 */
export function serieMensal(lancs: Lancamento[], financiamentos: Financiamento[], de: Mes, n: number, hoje: string): PontoMes[] {
  const ids = new Set(financiamentos.map((f) => f.id))
  const trilhas = financiamentos.map((f) => trilhaFinanciamento(f, lancs, hoje))
  const saidas = lancs.filter((l) => l.tipo === 'saida' && !ehMovimentoInterno(l))
  return Array.from({ length: n }, (_, i) => {
    const mes = mesDe(somarMeses(`${de}-01`, i))
    let pago = 0
    let aberto = 0
    for (const l of saidas) {
      if (mesDe(l.data) !== mes) continue
      if (ehPagamentoParcela(l, ids) && l.pagamentoFinanciamento !== 'antecipacao') continue
      if (l.status === 'pago') pago += l.valor
      else aberto += l.valor
    }
    for (const v of previstosDoMes(lancs, mes, 'saida')) aberto += v.valor
    for (const t of trilhas) {
      for (const p of t) {
        if (p.mes !== mes) continue
        if (p.situacao === 'paga') pago += p.valor
        else aberto += p.valor
      }
    }
    return { mes, pago, aberto }
  })
}
