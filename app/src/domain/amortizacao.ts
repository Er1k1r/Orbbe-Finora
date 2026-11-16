import type { Centavos, EfeitoAporte, SistemaAmortizacao } from './tipos'

export interface Parcela {
  numero: number
  juros: Centavos
  amortizacao: Centavos
  extra: Centavos
  parcela: Centavos // juros + amortização (sem o extra)
  saldo: Centavos // saldo após parcela e extra
}

export interface EntradaCronograma {
  saldo: Centavos
  taxa: number
  prazo: number
  sistema: SistemaAmortizacao
  aporte?: Centavos
  efeito?: EfeitoAporte
  parcelaFixa?: Centavos // só PRICE
  amortizacaoFixa?: Centavos // só SAC
}

function calcPmt(saldo: Centavos, taxa: number, n: number): Centavos {
  if (taxa === 0) return Math.round(saldo / n)
  return Math.round((saldo * taxa) / (1 - Math.pow(1 + taxa, -n)))
}

const SISTEMAS = ['SAC', 'PRICE']

export function gerarCronograma(e: EntradaCronograma): Parcela[] {
  const { taxa, sistema, efeito = 'reduzir_prazo' } = e
  if (!Number.isInteger(e.prazo) || e.prazo < 1) return []
  if (!Number.isFinite(taxa) || taxa < 0) return []
  if (!SISTEMAS.includes(sistema)) return []
  if (!Number.isFinite(e.saldo)) return []
  const aporte = Number.isFinite(e.aporte) && (e.aporte as number) > 0 ? (e.aporte as number) : 0
  let saldo = e.saldo
  let restante = e.prazo
  const fixaOk = (v?: number) => v !== undefined && Number.isSafeInteger(v) && v > 0
  let pmt = sistema === 'PRICE' ? (fixaOk(e.parcelaFixa) ? (e.parcelaFixa as number) : calcPmt(saldo, taxa, restante)) : 0
  let amortFixa =
    sistema === 'SAC' ? (fixaOk(e.amortizacaoFixa) ? (e.amortizacaoFixa as number) : Math.round(saldo / restante)) : 0
  const out: Parcela[] = []

  while (saldo > 0 && out.length < 1200) {
    const juros = Math.round(saldo * taxa)
    let amort = sistema === 'PRICE' ? pmt - juros : amortFixa
    if (amort >= saldo || restante <= 1) amort = saldo
    const extra = Math.min(aporte, saldo - amort)
    const saldoApos = saldo - amort - extra
    out.push({
      numero: out.length + 1,
      juros,
      amortizacao: amort,
      extra,
      parcela: juros + amort,
      saldo: saldoApos,
    })
    saldo = saldoApos
    restante -= 1
    if (efeito === 'reduzir_parcela' && extra > 0 && saldo > 0 && restante > 0) {
      pmt = calcPmt(saldo, taxa, restante)
      amortFixa = Math.round(saldo / restante)
    }
  }
  return out
}

export function resumirCronograma(c: Parcela[]) {
  return {
    prazo: c.length,
    jurosTotais: c.reduce((s, p) => s + p.juros, 0),
    totalPago: c.reduce((s, p) => s + p.parcela + p.extra, 0),
    primeiraParcela: c[0]?.parcela ?? 0,
  }
}

export function simularAporte(e: EntradaCronograma & { aporte: Centavos }) {
  const atual = resumirCronograma(gerarCronograma({ ...e, aporte: 0 }))
  const comAporte = resumirCronograma(gerarCronograma(e))
  return {
    atual,
    comAporte,
    economiaJuros: atual.jurosTotais - comAporte.jurosTotais,
    mesesEconomizados: atual.prazo - comAporte.prazo,
  }
}
