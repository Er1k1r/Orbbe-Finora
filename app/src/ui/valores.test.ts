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
  it('aceita 3 inteiros, separador sem inteiro ou sem decimais, e zero', () => {
    // 100 % = 1; 999,9999 % = 9,999999 (999,9999 * 1e4 = 9.999.999 milionésimos); ",5" = 0,5 % = 0,005; "5," = 5 % = 0,05
    expect(fracaoDeTaxa('100')).toBe(1)
    expect(fracaoDeTaxa('999,9999')).toBe(9.999999)
    expect(fracaoDeTaxa(',5')).toBe(0.005)
    expect(fracaoDeTaxa('.5')).toBe(0.005)
    expect(fracaoDeTaxa('5,')).toBe(0.05)
    expect(fracaoDeTaxa('0')).toBe(0)
    expect(fracaoDeTaxa('1.5')).toBe(0.015)
    expect(fracaoDeTaxa('1000')).toBeNaN() // 4 inteiros
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
  it('textoDeTaxa: 7,9899 (ponto ou vírgula), arredondamento a 4 casas e ruído de ponto flutuante', () => {
    // 7,9899 % = 0,079899 => 0,079899 * 1e6 = 79.899 => 79.899 / 1e4 = 7,9899
    expect(textoDeTaxa(0.079899)).toBe('7,9899')
    expect(textoDeTaxa(fracaoDeTaxa('7.9899') as number)).toBe('7,9899')
    // 0,08123456 * 1e6 = 81.234,56 => arredonda para 81.235 => 8,1235
    expect(textoDeTaxa(0.08123456)).toBe('8,1235')
    // ruído de 1e-12 some no arredondamento
    expect(textoDeTaxa(0.081234 + 1e-12)).toBe('8,1234')
    expect(textoDeTaxa(0)).toBe('0')
    expect(textoDeTaxa(1)).toBe('100')
    expect(textoDeTaxa(0.0001)).toBe('0,01')
  })
  it('filtro limita separador e casas', () => {
    expect(filtrarTaxa('1,23456')).toBe('1,2345')
    expect(filtrarTaxa('1,2,3')).toBe('1,23')
    expect(filtrarTaxa('a1.5b')).toBe('1.5')
    expect(filtrarTaxa('12345')).toBe('123')
  })
})
