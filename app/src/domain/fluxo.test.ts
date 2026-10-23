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
    // parcela do mês (31200) ainda não paga entra em previsto e saldoSeguro
    expect(r.parcelasPendentes).toBe(31200)
    expect(r.previsto).toBe(315000 + 10000 - 20000 - 31200)
    expect(r.saldoSeguro).toBe(315000 - 20000 - 31200)
    expect(r.inicial).toBe(100000 - 5000)
  })
})

describe('parcelas de financiamento no saldo (financiamentoId)', () => {
  const conta2: Conta = { id: 'c1', nome: 'Banco', tipo: 'banco', saldoInicial: 1000000 }
  // SAC 3.600.000 / 24 = 150.000 amortização + 1% de 3.600.000 = 36.000 juros => parcela 186.000
  const grande: Financiamento = { ...fin, saldoDevedor: 3600000, prazoRestante: 24 }
  const entrada = l({ tipo: 'entrada', valor: 500000 })
  const resumo = (ls: Lancamento[]) =>
    resumoMes({ mes: '2026-10', contas: [conta2], lancamentos: ls, financiamentos: [grande], aporteExtra: 0 })
  it('parcela do mês', () => expect(parcelaDoMes(grande)).toBe(186000))
  it('(a) nada registrado: parcela pendente reduz previsto e saldoSeguro', () => {
    const r = resumo([entrada])
    expect(r.sobraNormal).toBe(500000 - 186000) // 314.000
    expect(r.saldo).toBe(1500000)
    expect(r.parcelasPendentes).toBe(186000)
    expect(r.previsto).toBe(1500000 - 186000) // 1.314.000
    expect(r.saldoSeguro).toBe(1314000)
  })
  it('(b) saída paga com financiamentoId não conta em dobro', () => {
    const r = resumo([entrada, l({ valor: 186000, financiamentoId: 'f1' })])
    expect(r.despesas).toBe(0)
    expect(r.sobraNormal).toBe(314000)
    expect(r.saldo).toBe(1314000)
    expect(r.parcelasPendentes).toBe(0)
    expect(r.previsto).toBe(1314000)
    expect(r.saldoSeguro).toBe(1314000)
  })
  it('(c) saída pendente com financiamentoId é excluída das despesas pendentes', () => {
    const r = resumo([entrada, l({ valor: 186000, financiamentoId: 'f1', status: 'pendente' })])
    expect(r.despesasPendentes).toBe(0)
    expect(r.parcelasPendentes).toBe(186000)
    expect(r.previsto).toBe(1314000)
  })
})
