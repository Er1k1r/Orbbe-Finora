import { describe, it, expect } from 'vitest'
import { antecipacaoUltimas, estadoContrato, parcelaNoMes, parcelasAtrasadas, taxaImplicita, type PagamentoContrato } from './contrato'
import type { Contrato } from './tipos'

describe('taxaImplicita', () => {
  it('Price', () => {
    expect(taxaImplicita({ valorFinanciado: 100000, valorParcela: 34002, totalParcelas: 3, sistema: 'PRICE' })).toBeCloseTo(0.01, 4)
    expect(taxaImplicita({ valorFinanciado: 3000000, valorParcela: 95000, totalParcelas: 48, sistema: 'PRICE' })).toBeCloseTo(0.0186, 3)
  })
  it('SAC', () => {
    expect(taxaImplicita({ valorFinanciado: 120000, valorParcela: 31200, totalParcelas: 4, sistema: 'SAC' })).toBeCloseTo(0.01, 10)
  })
  it('null quando não fecha e 0 sem juros', () => {
    expect(taxaImplicita({ valorFinanciado: 100000, valorParcela: 30000, totalParcelas: 3, sistema: 'PRICE' })).toBeNull()
    expect(taxaImplicita({ valorFinanciado: 120000, valorParcela: 29000, totalParcelas: 4, sistema: 'SAC' })).toBeNull()
    expect(taxaImplicita({ valorFinanciado: 120000, valorParcela: 40000, totalParcelas: 3, sistema: 'PRICE' })).toBe(0)
  })
})

const c: Contrato = {
  valorFinanciado: 100000, valorParcela: 34002, totalParcelas: 3, sistema: 'PRICE',
  taxaMensal: 0.01, primeiraParcela: '2026-08-10', parcelasPagasAntes: 1,
}
const pg = (o: Partial<PagamentoContrato>): PagamentoContrato => ({ data: '2026-09-12', valor: 34002, tipo: 'parcela', status: 'pago', ...o })

describe('estadoContrato', () => {
  it('sem pagamentos', () => {
    const e = estadoContrato(c, [])
    expect(e.cronogramaOriginal.map((p) => p.parcela)).toEqual([34002, 34002, 34003])
    expect(e.totalContrato).toBe(102007)
    expect(e.saldoDevedor).toBe(66998)
    expect(e.parcelasPagas).toBe(1)
    expect(e.jurosPagos).toBe(1000)
    expect(e.restantes.map((p) => [p.numero, p.parcela, p.vencimento])).toEqual([
      [2, 34002, '2026-09-10'], [3, 34003, '2026-10-10'],
    ])
    expect(e.jurosAPagar).toBe(1007)
    expect(e.restanteNominal).toBe(68005)
    expect(e.descontoQuitacao).toBe(1007)
  })
  it('com pagamento de parcela', () => {
    const e = estadoContrato(c, [pg({})])
    expect(e.parcelasPagas).toBe(2)
    expect(e.saldoDevedor).toBe(33666)
    expect(e.jurosPagos).toBe(1670)
    expect(e.restantes.map((p) => [p.numero, p.parcela])).toEqual([[3, 34003]])
    expect(e.descontoQuitacao).toBe(337)
  })
  it('ignora pagamento após `ate` e pendente', () => {
    expect(estadoContrato(c, [pg({})], '2026-08-31').parcelasPagas).toBe(1)
    expect(estadoContrato(c, [pg({ status: 'pendente' })]).parcelasPagas).toBe(1)
  })
  it('antecipação encurta o prazo', () => {
    const e = estadoContrato(c, [pg({ data: '2026-09-01', valor: 33333, tipo: 'antecipacao' })])
    expect(e.saldoDevedor).toBe(33665)
    expect(e.restantes.map((p) => [p.numero, p.parcela])).toEqual([[2, 34002]])
    expect(e.antecipado).toBe(33333)
  })
})

describe('antecipacaoUltimas', () => {
  const e = estadoContrato(c, [])
  it('N=1', () => {
    expect(antecipacaoUltimas(e, 0.01, 1)).toEqual({ valor: 33333, nominal: 34003, desconto: 670 })
  })
  it('N=2 = saldo devedor', () => {
    const r = antecipacaoUltimas(e, 0.01, 2)
    expect(r.valor).toBe(66998)
    expect(r.desconto).toBe(1007)
  })
})

describe('parcelaNoMes / parcelasAtrasadas', () => {
  const e = estadoContrato(c, [])
  it('sem pagamentos', () => {
    expect(parcelaNoMes(c, e, '2026-07')).toBe(0)
    expect(parcelaNoMes(c, e, '2026-08')).toBe(34002)
    expect(parcelaNoMes(c, e, '2026-09')).toBe(34002)
    expect(parcelaNoMes(c, e, '2026-10')).toBe(34003)
    expect(parcelaNoMes(c, e, '2026-11')).toBe(0)
    expect(parcelasAtrasadas(e, '2026-10')).toBe(34002)
  })
  it('com antecipação', () => {
    const ea = estadoContrato(c, [pg({ data: '2026-09-01', valor: 33333, tipo: 'antecipacao' })])
    expect(parcelaNoMes(c, ea, '2026-10')).toBe(0)
  })
})
