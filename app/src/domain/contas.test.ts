import { describe, it, expect } from 'vitest'
import { criarAjuste, criarTransferencia, saldoReserva, situacaoContas } from './contas'
import type { Conta, Financiamento, Lancamento } from './tipos'

const conta = (id: string, p: Partial<Conta> = {}): Conta => ({ id, nome: id, tipo: 'banco', saldoInicial: 0, ...p })
let seq = 0
const lanc = (p: Partial<Lancamento>): Lancamento => ({
  id: 'l' + seq++, valor: 1000, data: '2026-10-05', tipo: 'saida', categoriaId: 'x',
  natureza: 'variavel', contaId: 'a', status: 'pago', ...p,
})

describe('situacaoContas', () => {
  it('cheque especial: saldo negativo, uso, limite disponível e juros', () => {
    const [s] = situacaoContas([conta('a', { saldoInicial: -5000, limiteChequeEspecial: 100000, taxaChequeEspecial: 0.08 })], [], '2026-10')
    expect(s.contaId).toBe('a')
    expect(s.saldo).toBe(-5000)
    expect(s.negativa).toBe(true)
    expect(s.ficaraNegativa).toBe(false)
    expect(s.usoLimite).toBe(5000)
    expect(s.limiteDisponivel).toBe(95000)
    expect(s.jurosEstimadoMes).toBe(400)
  })
  it('sem limite: limiteDisponivel undefined; sem taxa: juros 0; saldo positivo: uso 0', () => {
    const [neg] = situacaoContas([conta('a', { saldoInicial: -5000 })], [], '2026-10')
    expect(neg.limiteDisponivel).toBeUndefined()
    expect(neg.jurosEstimadoMes).toBe(0)
    const [pos] = situacaoContas([conta('a', { saldoInicial: 5000, limiteChequeEspecial: 1000, taxaChequeEspecial: 0.1 })], [], '2026-10')
    expect(pos.negativa).toBe(false)
    expect(pos.usoLimite).toBe(0)
    expect(pos.limiteDisponivel).toBe(1000)
    expect(pos.jurosEstimadoMes).toBe(0)
  })
  it('juros arredondados', () => {
    const [s] = situacaoContas([conta('a', { saldoInicial: -333, taxaChequeEspecial: 0.0815 })], [], '2026-10')
    expect(s.jurosEstimadoMes).toBe(27) // 27.1395
  })
  it('previsto: saída pendente do mês leva a conta ao negativo', () => {
    const [s] = situacaoContas([conta('a', { saldoInicial: 10000 })], [lanc({ valor: 15000, status: 'pendente' })], '2026-10')
    expect(s.saldo).toBe(10000)
    expect(s.previsto).toBe(-5000)
    expect(s.negativa).toBe(false)
    expect(s.ficaraNegativa).toBe(true)
  })
  it('previsto soma entradas pendentes e ignora pendentes de meses seguintes e de outras contas', () => {
    const ls = [
      lanc({ valor: 3000, tipo: 'entrada', status: 'pendente' }),
      lanc({ valor: 500, status: 'pendente' }),
      lanc({ valor: 9000, status: 'pendente', data: '2026-11-01' }),
      lanc({ valor: 9000, status: 'pendente', contaId: 'b' }),
    ]
    const [a, b] = situacaoContas([conta('a', { saldoInicial: 1000 }), conta('b', { saldoInicial: 20000 })], ls, '2026-10')
    expect(a.previsto).toBe(3500)
    expect(b.previsto).toBe(11000)
  })
  it('previsto inclui pendente de mês anterior; saldo só conta pagos até o fim do mês', () => {
    const ls = [
      lanc({ valor: 700, status: 'pendente', data: '2026-09-10' }),
      lanc({ valor: 200, data: '2026-10-31' }),
      lanc({ valor: 400, data: '2026-11-01' }),
    ]
    const [s] = situacaoContas([conta('a', { saldoInicial: 1000 })], ls, '2026-10')
    expect(s.saldo).toBe(800)
    expect(s.previsto).toBe(100)
  })
  it('movimento interno pendente também move o previsto da conta', () => {
    const ls = [lanc({ valor: 5000, status: 'pendente', especie: 'transferencia', transferenciaId: 't' })]
    const [s] = situacaoContas([conta('a', { saldoInicial: 1000 })], ls, '2026-10')
    expect(s.previsto).toBe(-4000)
    expect(s.ficaraNegativa).toBe(true)
  })
  it('ajuste pago entra no saldo', () => {
    const [s] = situacaoContas([conta('a', { saldoInicial: -12000 })], [lanc({ valor: 42000, tipo: 'entrada', especie: 'ajuste' })], '2026-10')
    expect(s.saldo).toBe(30000)
  })
})

describe('saldoReserva', () => {
  const contas = [conta('a', { saldoInicial: 200000, reserva: true }), conta('b', { saldoInicial: 50000 })]
  it('com `ate`, ignora pago posterior ao corte', () => {
    const ls = [lanc({ valor: 10000, data: '2026-10-05' }), lanc({ valor: 70000, data: '2026-11-03' })]
    expect(saldoReserva(contas, ls, '2026-10-31').saldo).toBe(190000)
    expect(saldoReserva(contas, ls).saldo).toBe(120000)
  })
  it('usa só a conta marcada', () => expect(saldoReserva(contas, [])).toEqual({ saldo: 200000, usandoTodas: false }))
  it('sem marcada usa todas', () =>
    expect(saldoReserva(contas.map((c) => ({ ...c, reserva: false })), [])).toEqual({ saldo: 250000, usandoTodas: true }))
  it('considera lançamentos pagos da conta marcada', () =>
    expect(saldoReserva(contas, [lanc({ valor: 10000 }), lanc({ valor: 99999, contaId: 'b' })]).saldo).toBe(190000))
})

describe('criarTransferencia', () => {
  const base = { id: 't1', contaOrigemId: 'a', contaDestinoId: 'b', valor: 5000, data: '2026-10-10' }
  it('gera par saída/entrada', () => {
    const [s, e] = criarTransferencia({ ...base, descricao: 'Reserva' })
    expect(s).toMatchObject({ id: 't1:saida', tipo: 'saida', contaId: 'a', valor: 5000, data: '2026-10-10', descricao: 'Reserva' })
    expect(e).toMatchObject({ id: 't1:entrada', tipo: 'entrada', contaId: 'b', valor: 5000, data: '2026-10-10', descricao: 'Reserva' })
    for (const l of [s, e]) {
      expect(l).toMatchObject({ especie: 'transferencia', transferenciaId: 't1', categoriaId: 'transferencia', natureza: 'variavel', status: 'pago' })
    }
  })
  it('descrição é opcional', () => expect(criarTransferencia(base)[0].descricao).toBeUndefined())
  it('mesma conta', () =>
    expect(() => criarTransferencia({ ...base, contaDestinoId: 'a' })).toThrow('Escolha contas diferentes para a transferência.'))
  it('valor <= 0', () => {
    expect(() => criarTransferencia({ ...base, valor: 0 })).toThrow('O valor da transferência deve ser maior que zero.')
    expect(() => criarTransferencia({ ...base, valor: -1 })).toThrow('O valor da transferência deve ser maior que zero.')
  })
})

describe('criarAjuste', () => {
  const base = { id: 'aj1', contaId: 'a', saldoApp: -12000, saldoReal: 30000, data: '2026-10-10' }
  it('real maior: entrada da diferença', () =>
    expect(criarAjuste(base)).toMatchObject({
      id: 'aj1', tipo: 'entrada', valor: 42000, contaId: 'a', data: '2026-10-10', especie: 'ajuste',
      categoriaId: 'ajuste', natureza: 'variavel', descricao: 'Ajuste de conferência', status: 'pago',
    }))
  it('real menor: saída da diferença', () =>
    expect(criarAjuste({ ...base, saldoApp: 30000, saldoReal: -12000 })).toMatchObject({ tipo: 'saida', valor: 42000 }))
  it('iguais: null', () => expect(criarAjuste({ ...base, saldoReal: -12000 })).toBeNull())
})

describe('situacaoContas com financiamento ligado a uma conta', () => {
  // SAC sem juros: 4 parcelas de 25.000 (set a dez/26), 1 paga antes do app; visto em novembro => out (atrasada) e nov em aberto.
  const fin: Financiamento = {
    id: 'f1', nome: 'Carro', valorFinanciado: 100000, valorParcela: 25000, totalParcelas: 4, sistema: 'SAC',
    taxaMensal: 0, primeiraParcela: '2026-09-05', parcelasPagasAntes: 1, contaId: 'a',
  }
  const contas = [conta('a', { saldoInicial: 100000 }), conta('b', { saldoInicial: 100000 })]

  it('desconta do previsto da conta as parcelas em aberto até o mês, mesmo sem lançamento', () => {
    const [a, b] = situacaoContas(contas, [], '2026-11', [fin])
    // out 25.000 + nov 25.000 em aberto; dez ainda não conta no mês de novembro.
    expect(a.previsto).toBe(100000 - 50000)
    expect(b.previsto).toBe(100000)
    expect(a.saldo).toBe(100000)
  })
  it('sem contaId nada muda; pagamento pendente da parcela não conta duas vezes', () => {
    const sem = { ...fin }
    delete sem.contaId
    expect(situacaoContas(contas, [], '2026-11', [sem])[0].previsto).toBe(100000)
    const pend = lanc({ valor: 25000, data: '2026-11-05', status: 'pendente', financiamentoId: 'f1', pagamentoFinanciamento: 'parcela' })
    expect(situacaoContas(contas, [pend], '2026-11', [fin])[0].previsto).toBe(100000 - 50000) // continua 50.000, não 75.000
  })
  it('antecipação pendente continua pelo lançamento', () => {
    const ant = lanc({ valor: 10000, data: '2026-11-05', status: 'pendente', financiamentoId: 'f1', pagamentoFinanciamento: 'antecipacao' })
    expect(situacaoContas(contas, [ant], '2026-11', [fin])[0].previsto).toBe(100000 - 50000 - 10000)
  })
})
