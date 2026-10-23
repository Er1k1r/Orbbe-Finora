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
  const f2: Financiamento = { ...grande, id: 'f2' }
  const resumo2 = (ls: Lancamento[], mes = '2026-10') =>
    resumoMes({ mes, contas: [conta2], lancamentos: ls, financiamentos: [grande, f2], aporteExtra: 0 })
  it('(f) pagamento vinculado a um financiamento não abate a parcela de outro', () => {
    const r = resumo2([entrada, l({ valor: 186000, financiamentoId: 'f1' })])
    expect(r.parcelas).toBe(372000)
    expect(r.parcelasPendentes).toBe(186000) // só f2 segue pendente
  })
  it('(g) pagamento acima da parcela zera as pendentes (sem negativo) e o excesso vira despesa', () => {
    const r = resumo([entrada, l({ valor: 200000, financiamentoId: 'f1' })])
    expect(r.parcelasPendentes).toBe(0)
    expect(r.despesas).toBe(14000)
    expect(r.sobraNormal).toBe(500000 - 14000 - 186000) // 300.000
    expect(r.saldo).toBe(1300000)
    expect(r.previsto).toBe(1300000)
  })
  it('(h) pagamento de outro mês não abate a parcela do mês visto', () => {
    const r = resumo([entrada, l({ valor: 186000, financiamentoId: 'f1', data: '2026-09-10' })])
    expect(r.parcelasPendentes).toBe(186000)
    expect(r.despesas).toBe(0)
  })
  it('(d) parcela pendente de mês anterior continua devida em previsto e saldoSeguro', () => {
    const atrasada = l({ valor: 186000, financiamentoId: 'f1', status: 'pendente', data: '2026-09-10' })
    const r = resumo([entrada, atrasada])
    expect(r.saldo).toBe(1500000)
    expect(r.despesasPendentes).toBe(0)
    expect(r.parcelasPendentes).toBe(186000) // só a parcela do mês visto
    expect(r.parcelasAtrasadas).toBe(186000)
    expect(r.previsto).toBe(1500000 - 186000 - 186000) // 1.128.000
    expect(r.saldoSeguro).toBe(1128000)
  })
  it('(e) parcela pendente do mês visto ou de mês posterior não entra como atrasada', () => {
    const r = resumo([
      entrada,
      l({ valor: 186000, financiamentoId: 'f1', status: 'pendente', data: '2026-10-20' }),
      l({ valor: 186000, financiamentoId: 'f1', status: 'pendente', data: '2026-11-10' }),
    ])
    expect(r.parcelasAtrasadas).toBe(0)
    expect(r.previsto).toBe(1314000)
  })
})

describe('financiamentoId órfão (financiamento apagado)', () => {
  const r = (ls: Lancamento[], fs: Financiamento[] = []) =>
    resumoMes({ mes: '2026-10', contas: [conta], lancamentos: ls, financiamentos: fs, aporteExtra: 0 })
  it('saída paga órfã é despesa comum e reduz a sobra', () => {
    const x = r([l({ valor: 50000, financiamentoId: 'apagado' })])
    expect(x.despesas).toBe(50000)
    expect(x.sobraNormal).toBe(-50000)
    expect(x.saldo).toBe(50000)
  })
  it('saída pendente órfã entra nas despesas pendentes e em previsto', () => {
    const x = r([l({ valor: 50000, financiamentoId: 'apagado', status: 'pendente' })])
    expect(x.despesasPendentes).toBe(50000)
    expect(x.previsto).toBe(50000)
  })
  it('órfã de mês anterior pendente não vira parcela atrasada, só despesa pendente', () => {
    const x = r([l({ valor: 50000, financiamentoId: 'apagado', status: 'pendente', data: '2026-09-10' })])
    expect(x.parcelasAtrasadas).toBe(0)
    expect(x.despesasPendentes).toBe(50000)
  })
  it('com o financiamento existente continua sendo vínculo', () => {
    const x = r([l({ valor: 31200, financiamentoId: 'f1' })], [fin])
    expect(x.despesas).toBe(0)
  })
})

describe('saldo até o fim do mês visualizado', () => {
  const c = { ...conta, saldoInicial: 100000 }
  const ls = [
    l({ tipo: 'entrada', valor: 50000, data: '2026-08-10' }),
    l({ valor: 30000, data: '2026-10-10' }),
  ]
  const ver = (mes: string, lancamentos: Lancamento[] = ls) =>
    resumoMes({ mes, contas: [c], lancamentos, financiamentos: [], aporteExtra: 0 })
  it('mês passado mostra o saldo do fim daquele mês', () => {
    const r = ver('2026-08')
    expect(r.inicial).toBe(100000)
    expect(r.saldo).toBe(150000)
  })
  it('mês seguinte parte do saldo anterior', () => {
    const r = ver('2026-10')
    expect(r.inicial).toBe(150000)
    expect(r.saldo).toBe(120000)
  })
  it('saldoContas com ate ignora datas posteriores', () => {
    expect(saldoContas([c], ls, '2026-09-30')).toBe(150000)
    expect(saldoContas([c], ls)).toBe(120000)
  })
  it('pendente de mês anterior conta em previsto e saldoSeguro', () => {
    const r = ver('2026-10', [l({ valor: 20000, data: '2026-09-15', status: 'pendente' })])
    expect(r.despesasPendentes).toBe(20000)
    expect(r.previsto).toBe(80000)
    expect(r.saldoSeguro).toBe(80000)
  })
  it('pendente de mês posterior não conta', () => {
    const r = ver('2026-10', [l({ valor: 20000, data: '2026-11-15', status: 'pendente' })])
    expect(r.despesasPendentes).toBe(0)
    expect(r.previsto).toBe(100000)
    expect(r.saldoSeguro).toBe(100000)
  })
  it('entradas vazias', () => {
    const r = resumoMes({ mes: '2026-10', contas: [], lancamentos: [], financiamentos: [], aporteExtra: 0 })
    expect(r).toMatchObject({ receitas: 0, despesas: 0, parcelas: 0, parcelasPendentes: 0, sobraNormal: 0, saldo: 0, inicial: 0, previsto: 0, saldoSeguro: 0 })
    expect(saldoContas([], [])).toBe(0)
    expect(saldoContas([c, { ...c, id: 'c2', saldoInicial: 5000 }], [])).toBe(105000)
  })
})
