import { describe, it, expect } from 'vitest'
import { saldoContas, resumoMes, parcelaDoMes } from './fluxo'
import type { Conta, Lancamento, Financiamento } from './tipos'

const conta: Conta = { id: 'c1', nome: 'Banco', tipo: 'banco', saldoInicial: 100000 }
const l = (p: Partial<Lancamento>): Lancamento => ({
  id: Math.random().toString(36).slice(2),
  valor: 0, data: '2026-10-10', tipo: 'saida', categoriaId: 'x', natureza: 'variavel',
  contaId: 'c1', status: 'pago', ...p,
})
const fin: Financiamento = {
  id: 'f1', nome: 'Carro', saldoDevedor: 120000, taxaMensal: 0.01,
  prazoRestante: 4, sistema: 'SAC', diaVencimento: 5,
}

describe('saldoContas', () => {
  it('ignora pendentes', () => {
    const ls = [
      l({ tipo: 'entrada', valor: 50000 }),
      l({ valor: 20000 }),
      l({ valor: 99999, status: 'pendente' }),
    ]
    expect(saldoContas([conta], ls)).toBe(100000 + 50000 - 20000)
  })
})

describe('parcelaDoMes', () => {
  it('primeira parcela sem aporte', () => expect(parcelaDoMes(fin)).toBe(31200))
})

describe('resumoMes', () => {
  const ls = [
    l({ tipo: 'entrada', valor: 300000 }),
    l({ valor: 80000 }),
    l({ valor: 20000, status: 'pendente' }),
    l({ tipo: 'entrada', valor: 10000, status: 'pendente' }),
    l({ valor: 5000, data: '2026-09-10' }), // outro mês
  ]
  const r = resumoMes({ mes: '2026-10', contas: [conta], lancamentos: ls, financiamentos: [fin], aporteExtra: 10000 })
  it('receitas e despesas do mês', () => {
    expect(r.receitas).toBe(310000)
    expect(r.despesas).toBe(100000)
    expect(r.parcelas).toBe(31200)
  })
  it('sobras', () => {
    expect(r.sobraNormal).toBe(310000 - 100000 - 31200)
    expect(r.sobraOtimizada).toBe(r.sobraNormal - 10000)
  })
  it('saldo, previsto e saldo seguro', () => {
    // saldo = 100000 + 300000 - 80000 - 5000 = 315000
    expect(r.saldo).toBe(315000)
    expect(r.previsto).toBe(315000 + 10000 - 20000)
    expect(r.saldoSeguro).toBe(315000 - 20000)
    expect(r.inicial).toBe(100000 - 5000)
  })
})
