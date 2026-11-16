import { describe, expect, it } from 'vitest'
import { appVazio, bloqueioRemoverCategoria, contaPadrao, linhasContas } from './padroes'
import type { Conta, Lancamento } from '../domain/tipos'

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

describe('linhasContas (card Contas do Resumo)', () => {
  const l = (id: string, contaId: string, valor: number, data: string, p: Partial<Lancamento> = {}): Lancamento => ({
    id, valor, data, tipo: 'saida', categoriaId: 'x', natureza: 'variavel', contaId, status: 'pago', ...p,
  })
  const contas = [c('r', 'Cofre', { reserva: true, saldoInicial: 50000 }), c('z', 'Zeta'), c('a', 'alfa', { saldoInicial: 100000 }), c('b', 'Beta')]
  const lancs = [
    l('1', 'a', 5000, '2026-10-02', { tipo: 'entrada' }), // alfa: 100000 + 5000 - 2000 = 103000 (nov e pendentes não contam em out)
    l('2', 'a', 2000, '2026-10-03'),
    l('3', 'a', 9999, '2026-11-01'),
    l('4', 'a', 7777, '2026-10-20', { status: 'pendente' }),
    l('5', 'b', 3000, '2026-10-05'), // Beta: 0 - 3000 = -3000 (negativa)
  ]
  it('uma linha por conta: não-reserva por nome (pt-BR) e depois a reserva; saldo do mês visto', () => {
    expect(linhasContas(contas, lancs, '2026-10')).toEqual([
      { id: 'a', nome: 'alfa', reserva: false, saldo: 103000, negativa: false },
      { id: 'b', nome: 'Beta', reserva: false, saldo: -3000, negativa: true },
      { id: 'z', nome: 'Zeta', reserva: false, saldo: 0, negativa: false },
      { id: 'r', nome: 'Cofre', reserva: true, saldo: 50000, negativa: false },
    ])
  })
  it('o mês seguinte inclui o lançamento pago de novembro', () => {
    expect(linhasContas(contas, lancs, '2026-11')[0].saldo).toBe(103000 - 9999)
  })
  it('sem contas, lista vazia', () => expect(linhasContas([], [], '2026-10')).toEqual([]))
})
