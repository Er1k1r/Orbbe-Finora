import { describe, expect, it } from 'vitest'
import { contaPadrao } from './padroes'
import type { Conta } from '../domain/tipos'

const c = (id: string, nome: string, extra: Partial<Conta> = {}): Conta => ({ id, nome, tipo: 'banco', saldoInicial: 0, ...extra })

describe('contaPadrao', () => {
  const contas = [c('3', 'Zeta'), c('1', 'Reserva', { reserva: true }), c('2', 'alfa'), c('4', 'Beta')]
  it('usa a conta preferida quando ela ainda existe', () => {
    expect(contaPadrao(contas, '3')?.id).toBe('3')
    expect(contaPadrao(contas, '1')?.id).toBe('1') // mesmo sendo reserva: foi escolha explícita
  })
  it('preferida apagada cai para a primeira NÃO reserva por nome pt-BR (sem diferenciar caixa)', () => {
    expect(contaPadrao(contas, 'sumiu')?.id).toBe('2') // alfa < Beta < Zeta
  })
  it('sem preferência: mesma regra, independente da ordem de entrada', () => {
    expect(contaPadrao(contas, undefined)?.id).toBe('2')
    expect(contaPadrao([...contas].reverse(), undefined)?.id).toBe('2')
  })
  it('pula a reserva mesmo quando ela vem primeiro por nome', () => {
    expect(contaPadrao([c('1', 'Aaa', { reserva: true }), c('2', 'Zzz')], undefined)?.id).toBe('2')
  })
  it('acentos ordenam como em pt-BR (Água antes de Banco)', () => {
    expect(contaPadrao([c('b', 'Banco'), c('a', 'Água')], undefined)?.id).toBe('a')
  })
  it('só há reservas: devolve a primeira por nome', () => {
    expect(contaPadrao([c('2', 'Y', { reserva: true }), c('1', 'X', { reserva: true })], undefined)?.id).toBe('1')
  })
  it('sem contas: undefined; não altera o array de entrada', () => {
    expect(contaPadrao([], 'x')).toBeUndefined()
    const copia = [...contas]
    contaPadrao(contas, undefined)
    expect(contas).toEqual(copia)
  })
})
