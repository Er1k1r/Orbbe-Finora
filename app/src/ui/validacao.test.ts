import { describe, expect, it } from 'vitest'
import { dataReal, mesReal, somenteDigitos } from './validacao'

describe('mesReal', () => {
  it('aceita AAAA-MM com mês de 01 a 12', () => {
    expect(mesReal('2026-12')).toBe(true)
    expect(mesReal('2026-01')).toBe(true)
    expect(mesReal('1999-09')).toBe(true)
  })
  it('rejeita texto livre, mês 00/13, vazio e sobras', () => {
    expect(mesReal('dez/2026')).toBe(false)
    expect(mesReal('2026-13')).toBe(false)
    expect(mesReal('2026-00')).toBe(false)
    expect(mesReal('')).toBe(false)
    expect(mesReal('2026-1')).toBe(false)
    expect(mesReal('2026-12-01')).toBe(false)
    expect(mesReal(' 2026-12')).toBe(false)
    expect(mesReal('x2026-12')).toBe(false)
  })
})

describe('dataReal e somenteDigitos', () => {
  it('dataReal rejeita 30/02 e mês 13', () => {
    expect(dataReal('2026-02-28')).toBe(true)
    expect(dataReal('2026-02-30')).toBe(false)
    expect(dataReal('2026-13-01')).toBe(false)
    expect(dataReal('')).toBe(false)
  })
  it('somenteDigitos limita a 12', () => {
    expect(somenteDigitos('a1b2')).toBe('12')
    expect(somenteDigitos('1234567890123456')).toBe('123456789012')
  })
})
