import { gerarCronograma } from './amortizacao'
import { fimDoMes, mesDe } from './meses'
import type { Centavos, Conta, Financiamento, Lancamento, Mes } from './tipos'

const sinal = (l: Lancamento) => (l.tipo === 'entrada' ? l.valor : -l.valor)
const soma = (ls: Lancamento[]) => ls.reduce((s, l) => s + l.valor, 0)

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

export function parcelaDoMes(f: Financiamento): Centavos {
  return (
    gerarCronograma({
      saldo: f.saldoDevedor, taxa: f.taxaMensal, prazo: f.prazoRestante, sistema: f.sistema,
    })[0]?.parcela ?? 0
  )
}

export interface EntradaResumo {
  mes: Mes
  contas: Conta[]
  lancamentos: Lancamento[]
  financiamentos: Financiamento[]
  aporteExtra: Centavos
}

export function resumoMes(e: EntradaResumo) {
  const doMes = e.lancamentos.filter((l) => mesDe(l.data) === e.mes)
  const entradas = doMes.filter((l) => l.tipo === 'entrada')
  // Pagamentos de parcela (financiamentoId) já estão representados em `parcelas`.
  const saidas = doMes.filter((l) => l.tipo === 'saida' && !l.financiamentoId)
  const parcelas = e.financiamentos.reduce((s, f) => s + parcelaDoMes(f), 0)
  const parcelasPendentes = e.financiamentos.reduce((s, f) => {
    const pago = soma(
      doMes.filter((l) => l.financiamentoId === f.id && l.tipo === 'saida' && l.status === 'pago'),
    )
    return s + Math.max(0, parcelaDoMes(f) - pago)
  }, 0)

  const receitas = soma(entradas)
  const despesas = soma(saidas)
  const sobraNormal = receitas - despesas - parcelas

  const saldo = saldoContas(e.contas, e.lancamentos, fimDoMes(e.mes))
  const ateMes = e.lancamentos.filter((l) => mesDe(l.data) <= e.mes && l.status === 'pendente')
  const receitasPendentes = soma(ateMes.filter((l) => l.tipo === 'entrada'))
  const despesasPendentes = soma(ateMes.filter((l) => l.tipo === 'saida' && !l.financiamentoId))
  const antes = e.lancamentos.filter((l) => mesDe(l.data) < e.mes)

  return {
    receitas,
    despesas,
    parcelas,
    parcelasPendentes,
    receitasPendentes,
    despesasPendentes,
    sobraNormal,
    sobraOtimizada: sobraNormal - e.aporteExtra,
    saldo,
    inicial: saldoContas(e.contas, antes),
    previsto: saldo + receitasPendentes - despesasPendentes - parcelasPendentes,
    saldoSeguro: saldo - despesasPendentes - parcelasPendentes,
  }
}
