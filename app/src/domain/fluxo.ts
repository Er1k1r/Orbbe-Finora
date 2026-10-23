import { estadoContrato, parcelaNoMes, parcelasAtrasadas as atrasadasDe, type EstadoContrato, type PagamentoContrato } from './contrato'
import { diffMeses, fimDoMes, mesDe } from './meses'
import type { Centavos, Conta, Financiamento, Lancamento, Mes } from './tipos'

const sinal = (l: Lancamento) => (l.tipo === 'entrada' ? l.valor : -l.valor)
const soma = (ls: Lancamento[]) => ls.reduce((s, l) => s + l.valor, 0)

/**
 * `financiamentoId` só vale como vínculo quando aponta para um financiamento existente;
 * com o financiamento apagado o lançamento volta a ser uma saída comum.
 */
export const ehPagamentoParcela = (l: Lancamento, ids: ReadonlySet<string>): boolean =>
  l.tipo === 'saida' && l.financiamentoId !== undefined && ids.has(l.financiamentoId)

/** Transferência entre contas e ajuste de conferência: mexem no saldo, nunca em receita/despesa. */
export const ehMovimentoInterno = (l: Lancamento): boolean => l.especie !== undefined

/** Saldo das contas; com `ate` ('YYYY-MM-DD') só conta pagos com data <= ate. */
export function saldoContas(contas: Conta[], lancs: Lancamento[], ate?: string): Centavos {
  const inicial = contas.reduce((s, c) => s + c.saldoInicial, 0)
  return (
    inicial +
    lancs
      .filter((l) => l.status === 'pago' && (ate === undefined || l.data <= ate))
      .reduce((s, l) => s + sinal(l), 0)
  )
}

/** Pagamentos (parcela ou antecipação) ligados ao financiamento, como o contrato os consome. */
export function pagamentosDe(f: Financiamento, lancs: Lancamento[]): PagamentoContrato[] {
  return lancs
    .filter((l) => l.tipo === 'saida' && !ehMovimentoInterno(l) && l.financiamentoId === f.id)
    .map((l) => ({ data: l.data, valor: l.valor, tipo: l.pagamentoFinanciamento ?? 'parcela', status: l.status }))
}

export function estadoFinanciamento(f: Financiamento, lancs: Lancamento[], ate?: string): EstadoContrato {
  return estadoContrato(f, pagamentosDe(f, lancs), ate)
}

export function parcelaDoMes(f: Financiamento, mes: Mes, lancs: Lancamento[]): Centavos {
  return parcelaNoMes(f, estadoFinanciamento(f, lancs, fimDoMes(mes)), mes)
}

export interface EntradaResumo {
  mes: Mes
  contas: Conta[]
  lancamentos: Lancamento[]
  financiamentos: Financiamento[]
  aporteExtra: Centavos
}

export function resumoMes(e: EntradaResumo) {
  const ids = new Set(e.financiamentos.map((f) => f.id))
  const doMes = e.lancamentos.filter((l) => mesDe(l.data) === e.mes && !ehMovimentoInterno(l))
  const entradas = doMes.filter((l) => l.tipo === 'entrada')
  // Pagamentos de parcela (financiamentoId de financiamento existente) já estão em `parcelas`.
  const saidas = doMes.filter((l) => l.tipo === 'saida' && !ehPagamentoParcela(l, ids))
  const parcelas = e.financiamentos.reduce((s, f) => s + parcelaDoMes(f, e.mes, e.lancamentos), 0)
  let parcelasPendentes = 0
  let excessoParcelas = 0 // pago acima da parcela do mês: gasto comum, não some da sobra
  let parcelasAtrasadas = 0
  for (const f of e.financiamentos) {
    const estado = estadoFinanciamento(f, e.lancamentos, fimDoMes(e.mes))
    const k = diffMeses(mesDe(f.primeiraParcela), e.mes) + 1
    // Em aberto = parcela do mês dentro do contrato e ainda não coberta pelo estado (pagamentos até o fim do mês).
    if (k >= 1 && k <= f.totalParcelas && k > estado.parcelasPagas) parcelasPendentes += parcelaNoMes(f, estado, e.mes)
    excessoParcelas += estado.aplicados.filter((a) => mesDe(a.data) === e.mes).reduce((s, a) => s + a.excesso, 0)
    parcelasAtrasadas += atrasadasDe(estado, e.mes)
  }
  // Antecipações pagas no mês: reduzem o saldo (já são saídas pagas), mas não são despesa nem mexem na sobra.
  const antecipacoes = soma(
    doMes.filter((l) => ehPagamentoParcela(l, ids) && l.status === 'pago' && l.pagamentoFinanciamento === 'antecipacao'),
  )

  const receitas = soma(entradas)
  const despesas = soma(saidas) + excessoParcelas
  const sobraNormal = receitas - despesas - parcelas

  const saldo = saldoContas(e.contas, e.lancamentos, fimDoMes(e.mes))
  const ateMes = e.lancamentos.filter((l) => mesDe(l.data) <= e.mes && l.status === 'pendente' && !ehMovimentoInterno(l))
  const receitasPendentes = soma(ateMes.filter((l) => l.tipo === 'entrada'))
  const despesasPendentes = soma(ateMes.filter((l) => l.tipo === 'saida' && !ehPagamentoParcela(l, ids)))
  const antes = e.lancamentos.filter((l) => mesDe(l.data) < e.mes)

  return {
    receitas,
    despesas,
    parcelas,
    parcelasPendentes,
    parcelasAtrasadas,
    antecipacoes,
    receitasPendentes,
    despesasPendentes,
    sobraNormal,
    sobraOtimizada: sobraNormal - e.aporteExtra,
    saldo,
    inicial: saldoContas(e.contas, antes),
    previsto: saldo + receitasPendentes - despesasPendentes - parcelasPendentes - parcelasAtrasadas,
    saldoSeguro: saldo - despesasPendentes - parcelasPendentes - parcelasAtrasadas,
  }
}
