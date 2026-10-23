import { describe, it, expect } from 'vitest'
import { saldoContas, resumoMes, parcelaDoMes, estadoFinanciamento } from './fluxo'
import { taxaImplicita } from './contrato'
import { gerarCronograma } from './amortizacao'
import type { Conta, Contrato, Lancamento, Financiamento } from './tipos'

const contratoDe = (S: number, i: number, n: number, sistema: 'SAC' | 'PRICE' = 'SAC', primeiraParcela = '2026-10-05'): Contrato => ({
  valorFinanciado: S, totalParcelas: n, taxaMensal: i, sistema, parcelasPagasAntes: 0, primeiraParcela,
  valorParcela: gerarCronograma({ saldo: S, taxa: i, prazo: n, sistema })[0]?.parcela ?? 0,
})

const conta: Conta = { id: 'c1', nome: 'Banco', tipo: 'banco', saldoInicial: 100000 }
const l = (p: Partial<Lancamento>): Lancamento => ({
  id: Math.random().toString(36).slice(2),
  valor: 0, data: '2026-10-10', tipo: 'saida', categoriaId: 'x', natureza: 'variavel',
  contaId: 'c1', status: 'pago', ...p,
})
const fin: Financiamento = { id: 'f1', nome: 'Carro', ...contratoDe(120000, 0.01, 4) }

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
  it('primeira parcela sem aporte', () => expect(parcelaDoMes(fin, '2026-10', [])).toBe(31200))
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
  const grande: Financiamento = { ...fin, ...contratoDe(3600000, 0.01, 24) }
  const entrada = l({ tipo: 'entrada', valor: 500000 })
  const resumo = (ls: Lancamento[]) =>
    resumoMes({ mes: '2026-10', contas: [conta2], lancamentos: ls, financiamentos: [grande], aporteExtra: 0 })
  it('parcela do mês', () => expect(parcelaDoMes(grande, '2026-10', [])).toBe(186000))
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
  it('(h) pagamento feito antes do vencimento já cobre a parcela', () => {
    // Pagamento feito em setembro cobre a parcela #1 (outubro): nada em aberto em outubro.
    const r = resumo([entrada, l({ valor: 186000, financiamentoId: 'f1', data: '2026-09-10' })])
    expect(r.parcelasPendentes).toBe(0)
    expect(r.despesas).toBe(0)
  })
  it('(d) parcela vencida e não paga (contrato iniciado em setembro) continua devida em previsto e saldoSeguro', () => {
    // Contrato começa em 2026-09-05, nenhuma parcela paga; visto em outubro.
    // Parcela #1 (setembro) = 36.000 + 150.000 = 186.000 => atrasada.
    // Parcela #2 (outubro) = 1% de 3.450.000 = 34.500 + 150.000 = 184.500 => pendente.
    // previsto = 1.500.000 - 186.000 - 184.500 = 1.129.500
    const desde = { ...grande, primeiraParcela: '2026-09-05' }
    const pendenteLigado = l({ valor: 186000, financiamentoId: 'f1', status: 'pendente', data: '2026-09-10' })
    const r = resumoMes({ mes: '2026-10', contas: [conta2], lancamentos: [entrada, pendenteLigado], financiamentos: [desde], aporteExtra: 0 })
    expect(r.saldo).toBe(1500000)
    expect(r.despesasPendentes).toBe(0) // o pendente ligado não é contado em dobro
    expect(r.parcelasAtrasadas).toBe(186000)
    expect(r.parcelasPendentes).toBe(184500)
    expect(r.previsto).toBe(1129500)
    expect(r.saldoSeguro).toBe(1500000 - 186000 - 184500)
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

describe('contrato visto em outros meses e antecipação', () => {
  const conta2: Conta = { id: 'c1', nome: 'Banco', tipo: 'banco', saldoInicial: 1000000 }
  // SAC 3.600.000 / 24, 1ª parcela em 2026-10-05: parcela #k = 150.000 + 1% do saldo anterior.
  const grande: Financiamento = { ...fin, ...contratoDe(3600000, 0.01, 24) }
  const entrada = l({ tipo: 'entrada', valor: 500000 })
  const ver = (mes: string, ls: Lancamento[]) =>
    resumoMes({ mes, contas: [conta2], lancamentos: ls, financiamentos: [grande], aporteExtra: 0 })
  it('mês passado (antes do contrato) não tem parcela', () => {
    expect(parcelaDoMes(grande, '2026-09', [])).toBe(0)
    expect(ver('2026-09', []).parcelas).toBe(0)
  })
  it('mês futuro: parcela do cronograma daquele mês', () => {
    // #3 em dezembro: saldo 3.300.000 => juros 33.000 + 150.000
    expect(parcelaDoMes(grande, '2026-12', [])).toBe(183000)
  })
  it('depois do fim do contrato a parcela é 0', () => {
    expect(parcelaDoMes(grande, '2028-10', [])).toBe(0) // #25 não existe
    expect(parcelaDoMes(grande, '2028-09', [])).toBe(151500) // #24: juros 1% de 150.000 = 1.500 + 150.000
  })
  it('mês passado já pago continua com o valor original da parcela', () => {
    const pg = l({ valor: 186000, financiamentoId: 'f1', data: '2026-10-05' })
    expect(parcelaDoMes(grande, '2026-10', [pg])).toBe(186000)
    expect(ver('2026-11', [pg]).parcelas).toBe(184500)
  })
  it('antecipação paga: fica em antecipacoes, reduz o saldo e não muda sobraNormal', () => {
    // Parcela do mês paga primeiro (dia 5); a antecipação (dia 12) só reduz o saldo devedor.
    const pg = l({ valor: 186000, financiamentoId: 'f1', data: '2026-10-05' })
    const base = ver('2026-10', [entrada, pg])
    const ant = l({ valor: 300000, financiamentoId: 'f1', pagamentoFinanciamento: 'antecipacao', data: '2026-10-12' })
    const r = ver('2026-10', [entrada, pg, ant])
    expect(r.antecipacoes).toBe(300000)
    expect(base.antecipacoes).toBe(0)
    expect(r.despesas).toBe(0)
    expect(r.sobraNormal).toBe(base.sobraNormal)
    expect(r.sobraNormal).toBe(500000 - 186000)
    expect(r.saldo).toBe(base.saldo - 300000)
  })
})

describe('pendente e excesso pelo estado do contrato', () => {
  const conta2: Conta = { id: 'c1', nome: 'Banco', tipo: 'banco', saldoInicial: 1000000 }
  const grande: Financiamento = { ...fin, ...contratoDe(3600000, 0.01, 24) } // #1 = 186.000 em 2026-10-05
  const price = (primeiraParcela: string, pagasAntes: number): Financiamento => {
    const base = { valorFinanciado: 3000000, valorParcela: 95000, totalParcelas: 48, sistema: 'PRICE' as const }
    return { id: 'f1', nome: 'P', ...base, taxaMensal: taxaImplicita(base)!, primeiraParcela, parcelasPagasAntes: pagasAntes }
  }
  const ver = (mes: string, ls: Lancamento[], f: Financiamento) =>
    resumoMes({ mes, contas: [conta2], lancamentos: ls, financiamentos: [f], aporteExtra: 0 })
  it('pagamento antecipado (28/09 para outubro): outubro sem pendente, setembro sem excesso', () => {
    const pg = l({ valor: 186000, financiamentoId: 'f1', data: '2026-09-28' })
    const out = ver('2026-10', [pg], grande)
    expect(out.parcelasPendentes).toBe(0)
    expect(out.despesas).toBe(0)
    const set = ver('2026-09', [pg], grande)
    expect(set.despesas).toBe(0) // excesso = 186.000 - 186.000 (passo #1) = 0; parcela do mês de setembro = 0
    expect(set.parcelasPendentes).toBe(0)
  })
  it('mês coberto por parcelasPagasAntes não tem pendente (Price, março de 2026, 9 pagas antes)', () => {
    const r = ver('2026-03', [], price('2026-01-10', 9))
    expect(r.parcelas).toBe(95000) // #3 reproduzida = parcela fixa
    expect(r.parcelasPendentes).toBe(0)
  })
  it('FIFO: setembro (#9) em aberto, pagamento em outubro quita #9; outubro segue pendente', () => {
    const f = price('2026-01-10', 8)
    const pg = l({ valor: 95000, financiamentoId: 'f1', data: '2026-10-10' })
    const r = ver('2026-10', [pg], f)
    expect(r.parcelas).toBe(95000) // #10 = parcela fixa
    expect(r.parcelasPendentes).toBe(95000)
    expect(r.despesas).toBe(0) // excesso do passo #9 = 95.000 - 95.000 = 0
    expect(r.parcelasAtrasadas).toBe(0)
    expect(r.saldo).toBe(1000000 - 95000)
    expect(r.previsto).toBe(r.saldo - 95000)
  })
  it('SAC: antecipação antes da parcela reduz a parcela e o pagamento a quita (sem fantasma)', () => {
    // antec 300.000 (02/10): saldo 3.300.000; passo #1 = 33.000 + 150.000 = 183.000; saldo final 3.150.000
    const ls = [
      l({ valor: 300000, financiamentoId: 'f1', pagamentoFinanciamento: 'antecipacao', data: '2026-10-02' }),
      l({ valor: 183000, financiamentoId: 'f1', data: '2026-10-05' }),
    ]
    const r = ver('2026-10', ls, grande)
    expect(r.parcelas).toBe(183000)
    expect(r.parcelasPendentes).toBe(0)
    expect(r.despesas).toBe(0)
    expect(r.antecipacoes).toBe(300000)
    expect(estadoFinanciamento(grande, ls, '2026-10-31').saldoDevedor).toBe(3150000)
  })
  it('pagamento 97.000 de uma parcela de 95.000: excesso 2.000 é despesa', () => {
    const r = ver('2026-10', [l({ valor: 97000, financiamentoId: 'f1', data: '2026-10-10' })], price('2026-10-10', 0))
    expect(r.parcelasPendentes).toBe(0)
    expect(r.despesas).toBe(2000)
  })
  it('pagamento datado depois do mês visto não conta para o mês', () => {
    const pgNov = l({ valor: 186000, financiamentoId: 'f1', data: '2026-11-10' })
    const r = ver('2026-10', [pgNov], grande)
    expect(r.parcelasPendentes).toBe(186000)
    // antecipação de novembro não altera a parcela de outubro (186.000, não 183.000)
    const antNov = l({ valor: 300000, financiamentoId: 'f1', pagamentoFinanciamento: 'antecipacao', data: '2026-11-03' })
    expect(parcelaDoMes(grande, '2026-10', [antNov])).toBe(186000)
    expect(estadoFinanciamento(grande, [antNov], '2026-10-31').saldoDevedor).toBe(3600000)
  })
})

describe('pagamento ligado sem parcela para consumir', () => {
  const conta2: Conta = { id: 'c1', nome: 'Banco', tipo: 'banco', saldoInicial: 1000000 }
  // SAC 200000/1%/2 em 2026-10-05: #1 = 100000 + 2000 = 102000; #2 = 100000 + 1000 = 101000
  const dois: Financiamento = { ...fin, ...contratoDe(200000, 0.01, 2) }
  const pgs = [
    l({ valor: 102000, financiamentoId: 'f1', data: '2026-10-05' }),
    l({ valor: 101000, financiamentoId: 'f1', data: '2026-11-05' }),
  ]
  const ver = (ls: Lancamento[]) => resumoMes({ mes: '2026-12', contas: [conta2], lancamentos: ls, financiamentos: [dois], aporteExtra: 0 })
  it('terceira parcela de um contrato de 2 entra como despesa (50.000) e reduz a sobra', () => {
    const r = ver([...pgs, l({ valor: 50000, financiamentoId: 'f1', data: '2026-12-05' })])
    expect(r.parcelas).toBe(0)
    expect(r.despesas).toBe(50000)
    expect(r.sobraNormal).toBe(-50000)
    expect(r.saldo).toBe(1000000 - 102000 - 101000 - 50000)
  })
  it('antecipação acima do saldo: antecipacoes 100.000 e despesas 30.000', () => {
    const rr = resumoMes({
      mes: '2026-10', contas: [conta2], financiamentos: [dois], aporteExtra: 0,
      lancamentos: [pgs[0], l({ valor: 130000, financiamentoId: 'f1', pagamentoFinanciamento: 'antecipacao', data: '2026-10-10' })],
    })
    // após #1 (102.000) o saldo é 100.000; 130.000 abate 100.000 e 30.000 viram despesa
    expect(rr.antecipacoes).toBe(100000)
    expect(rr.despesas).toBe(30000)
    expect(rr.sobraNormal).toBe(-30000 - 102000) // despesas 30.000 + parcela #1 de outubro 102.000
    expect(rr.saldo).toBe(1000000 - 102000 - 130000)
  })
  it('antecipação com saldo zerado entra como despesa (30.000), não em antecipacoes', () => {
    const r = ver([...pgs, l({ valor: 30000, financiamentoId: 'f1', pagamentoFinanciamento: 'antecipacao', data: '2026-12-10' })])
    expect(r.despesas).toBe(30000)
    expect(r.antecipacoes).toBe(0)
    expect(r.sobraNormal).toBe(-30000)
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

describe('movimentos internos (transferência e ajuste)', () => {
  const contaA: Conta = { id: 'A', nome: 'A', tipo: 'banco', saldoInicial: 100000 }
  const contaB: Conta = { id: 'B', nome: 'B', tipo: 'banco', saldoInicial: 0 }
  const base = [
    l({ tipo: 'entrada', valor: 50000, contaId: 'A', data: '2026-10-05' }),
    l({ tipo: 'saida', valor: 30000, contaId: 'A', data: '2026-10-06', especie: 'transferencia', transferenciaId: 't1' }),
    l({ tipo: 'entrada', valor: 30000, contaId: 'B', data: '2026-10-06', especie: 'transferencia', transferenciaId: 't1' }),
    l({ tipo: 'entrada', valor: 7000, contaId: 'A', data: '2026-10-07', especie: 'ajuste' }),
  ]
  const resumo = (ls: Lancamento[]) =>
    resumoMes({ mes: '2026-10', contas: [contaA, contaB], lancamentos: ls, financiamentos: [], aporteExtra: 0 })
  it('não entram em receitas/despesas/sobra; o saldo inclui o ajuste e a transferência soma zero', () => {
    const r = resumo(base)
    expect(r.receitas).toBe(50000)
    expect(r.despesas).toBe(0)
    expect(r.sobraNormal).toBe(50000)
    expect(r.saldo).toBe(157000)
  })
  it('ajuste pendente não entra em receitasPendentes', () => {
    const r = resumo([...base, l({ tipo: 'entrada', valor: 9000, status: 'pendente', especie: 'ajuste' })])
    expect(r.receitasPendentes).toBe(0)
    expect(r.despesasPendentes).toBe(0)
  })
})
