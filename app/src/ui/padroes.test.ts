import { describe, expect, it } from 'vitest'
import { appVazio, bloqueioRemoverCategoria, contaPadrao } from './padroes'
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

describe('appVazio', () => {
  const nada = { contas: [], fontes: [], lancamentos: [], financiamentos: [] }
  it('só é vazio sem contas, fontes, lançamentos e financiamentos', () => {
    expect(appVazio(nada)).toBe(true)
  })
  it.each(['contas', 'fontes', 'lancamentos', 'financiamentos'] as const)('um item em %s tira do onboarding', (k) => {
    expect(appVazio({ ...nada, [k]: [{}] })).toBe(false)
  })
})

describe('bloqueioRemoverCategoria', () => {
  const uso = (categoriaId: string) => ({ categoriaId })
  it('outros nunca pode ser removida (usada nos pagamentos de financiamento)', () => {
    expect(bloqueioRemoverCategoria('outros', [])).toBe('Essa categoria é usada nos pagamentos de financiamento e não pode ser removida.')
  })
  it('categoria com lançamentos é bloqueada; sem lançamentos libera', () => {
    expect(bloqueioRemoverCategoria('lazer', [uso('lazer')])).toBe('Esta categoria tem lançamentos.')
    expect(bloqueioRemoverCategoria('lazer', [uso('mercado')])).toBeUndefined()
  })
})
