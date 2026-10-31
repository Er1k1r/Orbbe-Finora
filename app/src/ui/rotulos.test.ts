import { describe, expect, it } from 'vitest'
import { rotuloNatureza, rotuloTipoConta } from './rotulos'

describe('rótulos de enums', () => {
  it('natureza', () => {
    expect(rotuloNatureza('fixo')).toBe('Fixo')
    expect(rotuloNatureza('variavel')).toBe('Variável')
  })
  it('tipo de conta', () => {
    expect(rotuloTipoConta('banco')).toBe('Banco')
    expect(rotuloTipoConta('caixa')).toBe('Caixa')
    expect(rotuloTipoConta('carteira')).toBe('Carteira')
  })
})
