import { describe, it, expect } from 'vitest'
import { gerarCronograma, resumirCronograma, simularAporte, validarFinanciamento } from './amortizacao'
import { parcelaDoMes } from './fluxo'
import type { Financiamento } from './tipos'

describe('Price', () => {
  const c = gerarCronograma({ saldo: 100000, taxa: 0.01, prazo: 3, sistema: 'PRICE' })
  it('calcula parcelas e quita no fim', () => {
    expect(c).toHaveLength(3)
    expect(c[0].parcela).toBe(34002)
    expect(c[2].saldo).toBe(0)
    expect(resumirCronograma(c).jurosTotais).toBe(2007)
  })
})

describe('SAC', () => {
  const c = gerarCronograma({ saldo: 120000, taxa: 0.01, prazo: 4, sistema: 'SAC' })
  it('parcelas decrescentes', () => {
    expect(c.map((p) => p.parcela)).toEqual([31200, 30900, 30600, 30300])
    expect(resumirCronograma(c).jurosTotais).toBe(3000)
  })
})

describe('aporte extra', () => {
  const base = { saldo: 120000, taxa: 0.01, prazo: 4, sistema: 'SAC' as const }
  it('reduzir_prazo encurta o prazo e economiza juros', () => {
    const r = simularAporte({ ...base, aporte: 30000, efeito: 'reduzir_prazo' })
    expect(r.comAporte.prazo).toBe(2)
    expect(r.comAporte.jurosTotais).toBe(1800)
    expect(r.economiaJuros).toBe(1200)
    expect(r.mesesEconomizados).toBe(2)
  })
  it('reduzir_parcela recalcula a amortização e baixa as parcelas seguintes', () => {
    // M1: 1200 + 30000 = 31200, extra 30000 -> saldo 60000; amort 60000/3 = 20000
    // M2: 600 + 20000 = 20600, extra 30000 -> saldo 10000; amort 10000/2 = 5000
    // M3: 100 + 5000 = 5100, extra 5000 -> saldo 0
    const c = gerarCronograma({ ...base, aporte: 30000, efeito: 'reduzir_parcela' })
    expect(c.map((p) => p.parcela)).toEqual([31200, 20600, 5100])
  })
  it('Price com aporte e reduzir_prazo', () => {
    const c = gerarCronograma({ saldo: 100000, taxa: 0.01, prazo: 3, sistema: 'PRICE', aporte: 30000, efeito: 'reduzir_prazo' })
    expect(c).toHaveLength(2)
    expect(c[0]).toMatchObject({ juros: 1000, parcela: 34002, amortizacao: 33002, extra: 30000, saldo: 36998 })
    // M2: juros round(36998 * 0.01) = 370; amort 34002 - 370 = 33632; extra = 36998 - 33632 = 3366
    expect(c[1]).toMatchObject({ juros: 370, amortizacao: 33632, extra: 3366, saldo: 0 })
    expect(resumirCronograma(c).jurosTotais).toBe(1370)
  })
  it('aporte negativo ou NaN vale 0', () => {
    const sem = gerarCronograma(base)
    expect(gerarCronograma({ ...base, aporte: -5000 })).toEqual(sem)
    expect(gerarCronograma({ ...base, aporte: NaN })).toEqual(sem)
  })
  it('sem aporte, cenário igual ao atual', () => {
    const r = simularAporte({ ...base, aporte: 0, efeito: 'reduzir_prazo' })
    expect(r.economiaJuros).toBe(0)
  })
})

describe('entradas inválidas', () => {
  const ok = { saldo: 120000, taxa: 0.01, prazo: 4, sistema: 'SAC' as const }
  it('taxa NaN ou negativa devolve []', () => {
    expect(gerarCronograma({ ...ok, taxa: NaN })).toEqual([])
    expect(gerarCronograma({ ...ok, taxa: -0.01 })).toEqual([])
  })
  it('prazo 0 ou fracionário devolve []', () => {
    expect(gerarCronograma({ ...ok, prazo: 0 })).toEqual([])
    expect(gerarCronograma({ ...ok, prazo: 2.5 })).toEqual([])
  })
  it('sistema com caixa errada devolve []', () => {
    expect(gerarCronograma({ ...ok, sistema: 'Price' as never })).toEqual([])
  })
  it('saldo NaN devolve []', () => expect(gerarCronograma({ ...ok, saldo: NaN })).toEqual([]))
  it('parcelaDoMes é 0 para financiamento inválido', () => {
    const f: Financiamento = { id: 'f', nome: 'x', saldoDevedor: 120000, taxaMensal: NaN, prazoRestante: 4, sistema: 'SAC', diaVencimento: 5 }
    expect(parcelaDoMes(f)).toBe(0)
  })
})

describe('validarFinanciamento', () => {
  const ok = { saldoDevedor: 120000, taxaMensal: 0.01, prazoRestante: 24, sistema: 'SAC', diaVencimento: 5 }
  it('válido', () => expect(validarFinanciamento(ok)).toEqual([]))
  it('diaVencimento é opcional', () => {
    const { diaVencimento: _d, ...semDia } = ok
    expect(validarFinanciamento(semDia)).toEqual([])
  })
  it.each([
    ['saldo zero', { saldoDevedor: 0 }],
    ['saldo fracionário', { saldoDevedor: 10.5 }],
    ['taxa NaN', { taxaMensal: NaN }],
    ['taxa negativa', { taxaMensal: -1 }],
    ['prazo 0', { prazoRestante: 0 }],
    ['prazo 1201', { prazoRestante: 1201 }],
    ['sistema inválido', { sistema: 'Price' }],
    ['dia 0', { diaVencimento: 0 }],
    ['dia 32', { diaVencimento: 32 }],
  ])('%s gera exatamente um problema', (_n, extra) => {
    expect(validarFinanciamento({ ...ok, ...extra })).toHaveLength(1)
  })
  it('acumula vários problemas', () => {
    expect(validarFinanciamento({ ...ok, saldoDevedor: -1, prazoRestante: 0 })).toHaveLength(2)
  })
})
