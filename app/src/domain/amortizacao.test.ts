import { describe, it, expect } from 'vitest'
import { gerarCronograma, resumirCronograma, simularAporte } from './amortizacao'

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
  it('reduzir_parcela mantém prazo e baixa a parcela', () => {
    const c = gerarCronograma({ ...base, aporte: 30000, efeito: 'reduzir_parcela' })
    expect(c[1].parcela).toBe(20600)
  })
  it('sem aporte, cenário igual ao atual', () => {
    const r = simularAporte({ ...base, aporte: 0, efeito: 'reduzir_prazo' })
    expect(r.economiaJuros).toBe(0)
  })
})
