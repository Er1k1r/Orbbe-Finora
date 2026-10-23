import { describe, it, expect } from 'vitest'
import { formatarBRL, centavosDeDigitos } from './dinheiro'

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
})
