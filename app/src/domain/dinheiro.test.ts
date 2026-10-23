import { describe, it, expect } from 'vitest'
import { formatarBRL, centavosDeDigitos, formatarNumero, formatarPct } from './dinheiro'

describe('dinheiro', () => {
  it('formata em reais', () => {
    expect(formatarBRL(123456).replace(/\s/g, ' ')).toBe('R$ 1.234,56')
    expect(formatarBRL(-5000).replace(/\s/g, ' ')).toBe('-R$ 50,00')
  })
  it('centavosDeDigitos', () => {
    expect(centavosDeDigitos('1250')).toBe(1250)
    expect(centavosDeDigitos('')).toBe(0)
    expect(centavosDeDigitos('0007')).toBe(7)
  })
  it('formatarNumero usa vírgula decimal', () => {
    expect(formatarNumero(5.7).replace(/\s/g, ' ')).toBe('5,7')
    expect(formatarNumero(1234.5, 2).replace(/\s/g, ' ')).toBe('1.234,50')
    expect(formatarNumero(3, 0)).toBe('3')
  })
  it('formatarPct', () => {
    expect(formatarPct(0.0199).replace(/\s/g, ' ')).toBe('1,99%')
    expect(formatarPct(0.1, 0)).toBe('10%')
  })
})
