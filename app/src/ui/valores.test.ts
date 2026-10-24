import { describe, expect, it } from 'vitest'
import { comSinal, fracaoDeTaxa, textoDeTaxa, filtrarTaxa } from './valores'

describe('comSinal', () => {
  it('aplica o sinal e nunca devolve -0', () => {
    expect(comSinal('1500', true)).toBe(-1500)
    expect(comSinal('1500', false)).toBe(1500)
    expect(Object.is(comSinal('', true), 0)).toBe(true)
    expect(Object.is(comSinal('0', true), 0)).toBe(true)
  })
})

describe('fracaoDeTaxa', () => {
  it('converte percent em fração sem erro de ponto flutuante', () => {
    expect(fracaoDeTaxa('8,1234')).toBe(0.081234)
    expect(fracaoDeTaxa('7.9899')).toBe(0.079899)
    expect(fracaoDeTaxa('8')).toBe(0.08)
    expect(fracaoDeTaxa('0,5')).toBe(0.005)
  })
  it('vazio é undefined; lixo é NaN', () => {
    expect(fracaoDeTaxa('  ')).toBeUndefined()
    expect(fracaoDeTaxa(',')).toBeNaN()
    expect(fracaoDeTaxa('1,2,3')).toBeNaN()
    expect(fracaoDeTaxa('1,23456')).toBeNaN()
  })
})

describe('textoDeTaxa / filtrarTaxa', () => {
  it('ida e volta preserva 4 casas', () => {
    for (const t of ['8', '7,9899', '8,1234', '0,0001', '12,5']) expect(textoDeTaxa(fracaoDeTaxa(t) as number)).toBe(t)
  })
  it('filtro limita separador e casas', () => {
    expect(filtrarTaxa('1,23456')).toBe('1,2345')
    expect(filtrarTaxa('1,2,3')).toBe('1,23')
    expect(filtrarTaxa('a1.5b')).toBe('1.5')
    expect(filtrarTaxa('12345')).toBe('123')
  })
})
