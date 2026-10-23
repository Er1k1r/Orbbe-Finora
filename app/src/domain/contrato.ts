import { gerarCronograma, type Parcela } from './amortizacao'
import { diffMeses, mesDe, somarMeses } from './meses'
import type { Centavos, Contrato, Mes, PagamentoFinanciamento, StatusLancamento } from './tipos'

export type DadosCarne = Pick<Contrato, 'valorFinanciado' | 'valorParcela' | 'totalParcelas' | 'sistema'>

const pmtExato = (pv: number, i: number, n: number) => (i === 0 ? pv / n : (pv * i) / (1 - Math.pow(1 + i, -n)))

/** Taxa mensal implícita no carnê; null quando os dados não fecham (parcela pequena demais). */
export function taxaImplicita(c: DadosCarne): number | null {
  const { valorFinanciado: pv, valorParcela: p, totalParcelas: n } = c
  if (!(pv > 0) || !(p > 0) || !Number.isInteger(n) || n < 1) return null
  if (c.sistema === 'SAC') {
    const i = (p - pv / n) / pv
    return i >= 0 ? i : null
  }
  if (p * n < pv) return null
  if (p * n === pv) return 0
  let lo = 0
  let hi = 1
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2
    if (pmtExato(pv, mid, n) > p) hi = mid
    else lo = mid
  }
  return (lo + hi) / 2
}

export interface PagamentoContrato { data: string; valor: Centavos; tipo: PagamentoFinanciamento; status: StatusLancamento }
export interface ParcelaContrato extends Parcela { vencimento: string }
export interface EstadoContrato {
  cronogramaOriginal: ParcelaContrato[]
  parcelasPagas: number
  saldoDevedor: Centavos
  jurosPagos: Centavos
  antecipado: Centavos
  restantes: ParcelaContrato[] // `numero` = posição no contrato
  jurosAPagar: Centavos
  totalContrato: Centavos
  restanteNominal: Centavos
  descontoQuitacao: Centavos
}

const vencimentoDe = (c: Contrato, numero: number) => somarMeses(c.primeiraParcela, numero - 1)

function cronograma(c: Contrato, saldo: Centavos, prazo: number): Parcela[] {
  return gerarCronograma({
    saldo, taxa: c.taxaMensal, prazo, sistema: c.sistema,
    parcelaFixa: c.sistema === 'PRICE' ? c.valorParcela : undefined,
    amortizacaoFixa: c.sistema === 'SAC' ? Math.round(c.valorFinanciado / c.totalParcelas) : undefined,
  })
}

/** Estado do contrato após as parcelas pagas antes do app e os pagamentos pagos (até `ate`, se dado). */
export function estadoContrato(c: Contrato, pagamentos: PagamentoContrato[], ate?: string): EstadoContrato {
  const cronogramaOriginal = cronograma(c, c.valorFinanciado, c.totalParcelas)
    .map((p) => ({ ...p, vencimento: vencimentoDe(c, p.numero) }))
  let saldo = c.valorFinanciado
  let pagas = 0
  let jurosPagos = 0
  let antecipado = 0
  const passoRegular = () => {
    const p = cronograma(c, saldo, c.totalParcelas - pagas)[0]
    if (!p) return
    jurosPagos += p.juros
    saldo = p.saldo
    pagas += 1
  }
  for (let k = 0; k < Math.min(c.parcelasPagasAntes, c.totalParcelas); k++) passoRegular()
  const validos = pagamentos
    .filter((p) => p.status === 'pago' && (ate === undefined || p.data <= ate))
    .sort((a, b) => a.data.localeCompare(b.data))
  for (const p of validos) {
    if (saldo <= 0) break
    if (p.tipo === 'antecipacao') {
      const v = Math.min(p.valor, saldo)
      saldo -= v
      antecipado += v
    } else passoRegular()
  }
  const restantes = cronograma(c, saldo, c.totalParcelas - pagas).map((p, i) => ({
    ...p, numero: pagas + i + 1, vencimento: vencimentoDe(c, pagas + i + 1),
  }))
  const soma = (xs: Parcela[], f: (p: Parcela) => number) => xs.reduce((s, p) => s + f(p), 0)
  const restanteNominal = soma(restantes, (p) => p.parcela)
  return {
    cronogramaOriginal, parcelasPagas: pagas, saldoDevedor: saldo, jurosPagos, antecipado, restantes,
    jurosAPagar: soma(restantes, (p) => p.juros),
    totalContrato: soma(cronogramaOriginal, (p) => p.parcela),
    restanteNominal,
    descontoQuitacao: restanteNominal - saldo,
  }
}

/** Valor presente (à taxa do contrato) das últimas `n` parcelas restantes e o desconto em relação ao nominal. */
export function antecipacaoUltimas(e: EstadoContrato, taxa: number, n: number) {
  if (!(n > 0)) return { valor: 0, nominal: 0, desconto: 0 }
  const ult = e.restantes.slice(-Math.floor(n))
  const offset = e.restantes.length - ult.length
  const valor = Math.round(ult.reduce((s, p, k) => s + p.parcela / Math.pow(1 + taxa, offset + k + 1), 0))
  const nominal = ult.reduce((s, p) => s + p.parcela, 0)
  return { valor, nominal, desconto: nominal - valor }
}

/** Parcela que vence em `mes`: já paga → valor do cronograma original; em aberto → restante; fora do contrato → 0. */
export function parcelaNoMes(c: Contrato, e: EstadoContrato, mes: Mes): Centavos {
  const k = diffMeses(mesDe(c.primeiraParcela), mes) + 1
  if (k < 1 || k > c.totalParcelas) return 0
  if (k <= e.parcelasPagas) return e.cronogramaOriginal[k - 1]?.parcela ?? 0
  return e.restantes.find((p) => p.numero === k)?.parcela ?? 0
}

/** Soma das parcelas em aberto que venceram antes de `mes`. */
export function parcelasAtrasadas(e: EstadoContrato, mes: Mes): Centavos {
  return e.restantes.filter((p) => mesDe(p.vencimento) < mes).reduce((s, p) => s + p.parcela, 0)
}
