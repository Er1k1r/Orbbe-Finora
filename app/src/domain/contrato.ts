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
  pagas: ParcelaContrato[] // passos regulares reproduzidos (pagas antes do app e pagamentos), com o numero do contrato
  /**
   * Pagamentos ligados aplicados. Pagamento sem parcela para consumir ('parcela' com contrato quitado/além do total)
   * ou antecipação com saldo já zerado entra com `numero: 0`, `valorParcela: 0` e `excesso = valor`,
   * para o dinheiro continuar aparecendo como despesa no mês (nunca some do fluxo).
   */
  aplicados: { data: string; valor: Centavos; numero: number; valorParcela: Centavos; excesso: Centavos; tipo: PagamentoFinanciamento }[]
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
  const pagasPassos: ParcelaContrato[] = []
  const aplicados: EstadoContrato['aplicados'] = []
  const passoRegular = () => {
    const p = cronograma(c, saldo, c.totalParcelas - pagas)[0]
    if (!p) return undefined
    jurosPagos += p.juros
    saldo = p.saldo
    pagas += 1
    const passo = { ...p, numero: pagas, vencimento: vencimentoDe(c, pagas) }
    pagasPassos.push(passo)
    return passo
  }
  for (let k = 0; k < Math.min(c.parcelasPagasAntes, c.totalParcelas); k++) passoRegular()
  const validos = pagamentos
    .filter((p) => p.status === 'pago' && (ate === undefined || p.data <= ate))
    .sort((a, b) => a.data.localeCompare(b.data))
  for (const p of validos) {
    if (p.tipo === 'antecipacao') {
      if (saldo <= 0) {
        aplicados.push({ data: p.data, valor: p.valor, numero: 0, valorParcela: 0, excesso: p.valor, tipo: 'antecipacao' })
        continue
      }
      const v = Math.min(p.valor, saldo)
      saldo -= v
      antecipado += v
    } else {
      const passo = passoRegular()
      aplicados.push(passo
        ? { data: p.data, valor: p.valor, numero: passo.numero, valorParcela: passo.parcela, excesso: Math.max(0, p.valor - passo.parcela), tipo: 'parcela' }
        : { data: p.data, valor: p.valor, numero: 0, valorParcela: 0, excesso: p.valor, tipo: 'parcela' })
    }
  }
  const restantes = cronograma(c, saldo, c.totalParcelas - pagas).map((p, i) => ({
    ...p, numero: pagas + i + 1, vencimento: vencimentoDe(c, pagas + i + 1),
  }))
  const soma = (xs: Parcela[], f: (p: Parcela) => number) => xs.reduce((s, p) => s + f(p), 0)
  const restanteNominal = soma(restantes, (p) => p.parcela)
  return {
    cronogramaOriginal, parcelasPagas: pagas, saldoDevedor: saldo, jurosPagos, antecipado, restantes, pagas: pagasPassos, aplicados,
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

/** Parcela que vence em `mes`: já paga → valor do passo reproduzido; em aberto → restante; fora do contrato → 0. */
export function parcelaNoMes(c: Contrato, e: EstadoContrato, mes: Mes): Centavos {
  const k = diffMeses(mesDe(c.primeiraParcela), mes) + 1
  if (k < 1 || k > c.totalParcelas) return 0
  if (k <= e.parcelasPagas) return e.pagas[k - 1]?.parcela ?? e.cronogramaOriginal[k - 1]?.parcela ?? 0
  return e.restantes.find((p) => p.numero === k)?.parcela ?? 0
}

/** Soma das parcelas em aberto que venceram antes de `mes`. */
export function parcelasAtrasadas(e: EstadoContrato, mes: Mes): Centavos {
  return e.restantes.filter((p) => mesDe(p.vencimento) < mes).reduce((s, p) => s + p.parcela, 0)
}

const dataReal = (v: unknown) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const [a, m, d] = v.split('-').map(Number)
  return m >= 1 && m <= 12 && d >= 1 && d <= new Date(Date.UTC(a, m, 0)).getUTCDate()
}

/** Problemas (pt-BR) de um contrato; lista vazia = válido. */
export function validarContrato(c: Contrato): string[] {
  const erros: string[] = []
  if (!Number.isSafeInteger(c.valorFinanciado) || c.valorFinanciado <= 0) erros.push('O valor financiado deve ser um inteiro maior que zero.')
  if (!Number.isSafeInteger(c.valorParcela) || c.valorParcela <= 0) erros.push('O valor da parcela deve ser um inteiro maior que zero.')
  if (!Number.isInteger(c.totalParcelas) || c.totalParcelas < 1 || c.totalParcelas > 1200)
    erros.push('O total de parcelas deve ser um número inteiro de 1 a 1200.')
  if (c.sistema !== 'SAC' && c.sistema !== 'PRICE') erros.push('O sistema de amortização deve ser SAC ou Price.')
  if (!dataReal(c.primeiraParcela)) erros.push('A data da primeira parcela é inválida.')
  if (!Number.isInteger(c.parcelasPagasAntes) || c.parcelasPagasAntes < 0 || c.parcelasPagasAntes > c.totalParcelas)
    erros.push('As parcelas pagas antes do app devem ser um inteiro de 0 até o total de parcelas.')
  if (erros.length === 0 && taxaImplicita(c) === null) erros.push('O valor da parcela é pequeno demais para esse valor financiado.')
  return erros
}
