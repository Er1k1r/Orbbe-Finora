import { describe, it, expect } from 'vitest'
import { mesDe, mesAnterior, mesesAnteriores, fimDoMes, hojeLocal } from './meses'

describe('meses', () => {
  it('mesDe extrai YYYY-MM', () => expect(mesDe('2026-10-19')).toBe('2026-10'))
  it('mesAnterior atravessa o ano', () => {
    expect(mesAnterior('2026-01', 1)).toBe('2025-12')
    expect(mesAnterior('2026-03', 0)).toBe('2026-03')
  })
  it('mesesAnteriores devolve n meses antes do mês', () => {
    expect(mesesAnteriores('2026-02', 3)).toEqual(['2025-11', '2025-12', '2026-01'])
  })
  it('fimDoMes', () => expect(fimDoMes('2026-02')).toBe('2026-02-28'))
  it('mesAnterior com n negativo avança meses', () => expect(mesAnterior('2025-12', -1)).toBe('2026-01'))
  it('fimDoMes em ano bissexto', () => expect(fimDoMes('2028-02')).toBe('2028-02-29'))
  it('hojeLocal usa o calendário local', () => {
    expect(hojeLocal(new Date(2026, 9, 31, 22, 0))).toBe('2026-10-31')
    expect(hojeLocal(new Date(2026, 0, 5, 0, 30))).toBe('2026-01-05')
  })
})
