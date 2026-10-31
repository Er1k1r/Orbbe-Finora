import { describe, expect, it } from 'vitest'
import {
  baseRapida, desvincularContrato, idsDeExclusao, montarCategoria, montarConferencia, montarConta, montarFonte,
  montarLancamentoRapido, montarPagamento, montarParcelado, montarPlano, montarRenda, montarTransferencia,
  sobraLivre, type EntradaRapida,
} from './construtores'
import { dataReal } from './validacao'
import { semVazios } from '../test-ajuda'
import type { Lancamento } from '../domain/tipos'

const centavosOk = (n: number) => Number.isSafeInteger(n)

const rapida = (p: Partial<EntradaRapida> = {}): EntradaRapida => ({
  id: 'l1', tipo: 'saida', categoria: { id: 'mercado', natureza: 'variavel' }, natureza: 'auto', contaId: 'c1',
  descricao: '', observacao: '', valor: 4590, data: '2026-10-19', pendente: false, fonteId: '', modo: 'comum',
  financiamentoId: '', pagamento: 'parcela', repete: false, ate: '', ...p,
})

describe('semVazios (o próprio detector)', () => {
  it('acusa undefined e null em qualquer nível', () => {
    expect(() => semVazios({ a: 1 })).not.toThrow()
    expect(() => semVazios({ a: undefined })).toThrow('linha.a')
    expect(() => semVazios({ a: { b: null } })).toThrow('linha.a.b')
    expect(() => semVazios([{ a: 1 }, { a: undefined }])).toThrow('linha[1].a')
  })
})

describe('montarLancamentoRapido', () => {
  it('saída simples: só os campos obrigatórios, status pago, natureza da categoria', () => {
    const l = montarLancamentoRapido(rapida())
    expect(l).toEqual({
      id: 'l1', valor: 4590, data: '2026-10-19', tipo: 'saida', categoriaId: 'mercado', natureza: 'variavel',
      contaId: 'c1', status: 'pago',
    })
    semVazios(l)
    expect(centavosOk(l.valor) && dataReal(l.data)).toBe(true)
  })
  it('natureza escolhida vence a da categoria', () => {
    expect(montarLancamentoRapido(rapida({ natureza: 'fixo' })).natureza).toBe('fixo')
    expect(montarLancamentoRapido(rapida({ categoria: { id: 'moradia', natureza: 'fixo' } })).natureza).toBe('fixo')
  })
  it('descrição e observação entram aparadas, e só quando não vazias', () => {
    const l = montarLancamentoRapido(rapida({ descricao: '  Feira ', observacao: ' obs ' }))
    expect(l.descricao).toBe('Feira')
    expect(l.observacao).toBe('obs')
    const v = montarLancamentoRapido(rapida({ descricao: '   ', observacao: '' }))
    expect('descricao' in v).toBe(false)
    expect('observacao' in v).toBe(false)
  })
  it('pendente vira status pendente', () => {
    expect(montarLancamentoRapido(rapida({ pendente: true })).status).toBe('pendente')
  })
  it('fonte só em entrada e só quando escolhida (sem fonte padrão)', () => {
    expect(montarLancamentoRapido(rapida({ tipo: 'entrada', fonteId: 'f1' })).fonteId).toBe('f1')
    expect('fonteId' in montarLancamentoRapido(rapida({ tipo: 'entrada', fonteId: '' }))).toBe(false)
    expect('fonteId' in montarLancamentoRapido(rapida({ tipo: 'saida', fonteId: 'f1' }))).toBe(false)
  })
  it('pagamento de financiamento leva o vínculo e o tipo', () => {
    const l = montarLancamentoRapido(rapida({ modo: 'financiamento', financiamentoId: 'fin1', pagamento: 'antecipacao' }))
    expect(l.financiamentoId).toBe('fin1')
    expect(l.pagamentoFinanciamento).toBe('antecipacao')
    expect('recorrencia' in l).toBe(false)
    semVazios(l)
  })
  it('recorrência mensal, com e sem mês final; nunca em financiamento', () => {
    const com = montarLancamentoRapido(rapida({ repete: true, ate: '2026-12' }))
    expect(com.recorrencia).toBe('mensal')
    expect(com.recorrenciaAte).toBe('2026-12')
    const sem = montarLancamentoRapido(rapida({ repete: true }))
    expect(sem.recorrencia).toBe('mensal')
    expect('recorrenciaAte' in sem).toBe(false)
    expect('recorrencia' in montarLancamentoRapido(rapida({ repete: true, modo: 'financiamento', financiamentoId: 'x' }))).toBe(false)
    semVazios(com)
    semVazios(sem)
  })
})

describe('montarParcelado', () => {
  it('parcela atual até a última, ids do grupo, meses seguidos, só a atual com o status escolhido', () => {
    // óculos 4/6 em 19/10: parcelas 4, 5 e 6 => 2026-10-19, 2026-11-19 e 2026-12-19
    const ls = montarParcelado(rapida({ descricao: 'Óculos', valor: 5000 }), 'g1', 6, 4)
    expect(ls.map((l) => l.id)).toEqual(['g1:4', 'g1:5', 'g1:6'])
    expect(ls.map((l) => l.data)).toEqual(['2026-10-19', '2026-11-19', '2026-12-19'])
    expect(ls.map((l) => l.status)).toEqual(['pago', 'pendente', 'pendente'])
    expect(ls.every((l) => l.valor === 5000 && l.descricao === 'Óculos' && l.contaId === 'c1')).toBe(true)
    expect(ls[0].parcelamento).toEqual({ grupoId: 'g1', numero: 4, total: 6 })
    semVazios(ls)
  })
  it('atual pendente; total/atual inválidos lançam erro em pt-BR', () => {
    expect(montarParcelado(rapida({ pendente: true }), 'g', 3, 1)[0].status).toBe('pendente')
    expect(() => montarParcelado(rapida(), 'g', 1, 1)).toThrow('pelo menos 2 parcelas')
    expect(() => montarParcelado(rapida(), 'g', 3, 4)).toThrow('entre 1 e o total')
  })
  it('baseRapida não carrega campos opcionais vazios', () => {
    expect(baseRapida(rapida())).toEqual({ tipo: 'saida', categoriaId: 'mercado', natureza: 'variavel', contaId: 'c1' })
  })
})

describe('montarConta', () => {
  const edit = { id: 'c1', nome: '  Itaú ', tipo: 'banco' as const, saldoInicial: 999 }
  const vazio = { saldoDigitos: '', negativo: false, limiteDigitos: '', taxa: undefined }
  it('sem opcionais: só id, nome aparado, tipo e saldo em centavos', () => {
    const c = montarConta(edit, { ...vazio, saldoDigitos: '150050' })
    expect(c).toEqual({ id: 'c1', nome: 'Itaú', tipo: 'banco', saldoInicial: 150050 })
    semVazios(c)
  })
  it('saldo negativo, limite, taxa e reserva entram quando preenchidos', () => {
    const c = montarConta({ ...edit, reserva: true }, { saldoDigitos: '25000', negativo: true, limiteDigitos: '100000', taxa: 0.08 })
    expect(c).toEqual({ id: 'c1', nome: 'Itaú', tipo: 'banco', saldoInicial: -25000, limiteChequeEspecial: 100000, taxaChequeEspecial: 0.08, reserva: true })
    semVazios(c)
  })
  it('opcionais antigos somem quando o formulário os esvazia; limite 0 não grava; saldo zero negativo vira 0', () => {
    const antigo = { ...edit, limiteChequeEspecial: 5, taxaChequeEspecial: 0.1, reserva: true }
    const c = montarConta({ ...antigo, reserva: false }, { saldoDigitos: '', negativo: true, limiteDigitos: '0', taxa: undefined })
    expect(c).toEqual({ id: 'c1', nome: 'Itaú', tipo: 'banco', saldoInicial: 0 })
    expect(Object.is(c.saldoInicial, 0)).toBe(true)
  })
  it('taxa zero é gravada (0 é um valor, não ausência)', () => {
    expect(montarConta(edit, { ...vazio, taxa: 0 }).taxaChequeEspecial).toBe(0)
  })
})

describe('montarConferencia e montarTransferencia', () => {
  it('conferência: saldo real maior vira entrada, menor vira saída; igual = null', () => {
    const base = { id: 'a1', contaId: 'c1', negativo: false, data: '2026-10-19' }
    // app 10.000 (R$ 100,00), real 12.550 => +2.550
    const mais = montarConferencia({ ...base, saldoApp: 10000, realDigitos: '12550' })!
    expect(mais).toMatchObject({ id: 'a1', valor: 2550, tipo: 'entrada', especie: 'ajuste', categoriaId: 'ajuste', status: 'pago' })
    // real -300 (negativo) => diferença -10.300 => saída de 10.300
    const menos = montarConferencia({ ...base, saldoApp: 10000, realDigitos: '300', negativo: true })!
    expect(menos).toMatchObject({ valor: 10300, tipo: 'saida' })
    expect(montarConferencia({ ...base, saldoApp: 10000, realDigitos: '10000' })).toBeNull()
    semVazios(mais)
    semVazios(menos)
    expect(dataReal(mais.data)).toBe(true)
  })
  it('transferência: par ligado com ids derivados; descrição só quando preenchida', () => {
    const [s, e] = montarTransferencia({ id: 't1', origemId: 'c1', destinoId: 'c2', valorDigitos: '5000', data: '2026-10-19', descricao: ' Reserva ' })
    expect(s).toMatchObject({ id: 't1:saida', tipo: 'saida', contaId: 'c1', valor: 5000, transferenciaId: 't1', especie: 'transferencia', descricao: 'Reserva' })
    expect(e).toMatchObject({ id: 't1:entrada', tipo: 'entrada', contaId: 'c2', valor: 5000, transferenciaId: 't1' })
    semVazios([s, e])
    const [sem] = montarTransferencia({ id: 't2', origemId: 'c1', destinoId: 'c2', valorDigitos: '100', data: '2026-10-19', descricao: '   ' })
    expect('descricao' in sem).toBe(false)
  })
  it('transferência inválida lança erro pt-BR', () => {
    const e = { id: 't', origemId: 'c1', destinoId: 'c1', valorDigitos: '100', data: '2026-10-19', descricao: '' }
    expect(() => montarTransferencia(e)).toThrow('contas diferentes')
    expect(() => montarTransferencia({ ...e, destinoId: 'c2', valorDigitos: '' })).toThrow('maior que zero')
  })
})

describe('montarFonte, montarCategoria e montarRenda', () => {
  const fixa = { id: 'f1', nome: ' Salário ', tipo: 'fixa' as const, valorEsperado: 1 }
  it('fonte fixa com dia: dia limitado a 1..31; valor em centavos; nome aparado', () => {
    expect(montarFonte(fixa, '350000', '5')).toEqual({ id: 'f1', nome: 'Salário', tipo: 'fixa', valorEsperado: 350000, diaPagamento: 5 })
    expect(montarFonte(fixa, '0', '45').diaPagamento).toBe(31)
    expect(montarFonte(fixa, '0', '0').diaPagamento).toBe(1)
    semVazios(montarFonte(fixa, '350000', '5'))
  })
  it('sem dia, ou tipo não fixo: nunca grava diaPagamento (nem o antigo)', () => {
    expect('diaPagamento' in montarFonte({ ...fixa, diaPagamento: 10 }, '100', '')).toBe(false)
    expect('diaPagamento' in montarFonte({ ...fixa, tipo: 'variavel', diaPagamento: 10 }, '100', '10')).toBe(false)
    semVazios(montarFonte({ ...fixa, tipo: 'eventual' }, '', ''))
  })
  it('categoria: nome aparado e sem o campo sistema', () => {
    const c = montarCategoria({ id: 'x', nome: ' Pets ', icone: 'PawPrint', tipo: 'saida', natureza: 'variavel', essencial: false, sistema: true })
    expect(c).toEqual({ id: 'x', nome: 'Pets', icone: 'PawPrint', tipo: 'saida', natureza: 'variavel', essencial: false })
    semVazios(c)
  })
  it('onboarding: só as fontes marcadas, na ordem das opções, e a conta principal', () => {
    const opcoes = [
      { tipo: 'fixa' as const, nome: 'Salário fixo' }, { tipo: 'variavel' as const, nome: 'Vendas' }, { tipo: 'eventual' as const, nome: 'Bicos' },
    ]
    const ids = { conta: 'k', fixa: 'a', variavel: 'b', eventual: 'c' }
    const r = montarRenda({ opcoes, sel: { eventual: '', fixa: '300000' }, ids, saldoDigitos: '12345' })
    expect(r.fontes).toEqual([
      { id: 'a', nome: 'Salário fixo', tipo: 'fixa', valorEsperado: 300000 },
      { id: 'c', nome: 'Bicos', tipo: 'eventual', valorEsperado: 0 },
    ])
    expect(r.conta).toEqual({ id: 'k', nome: 'Conta principal', tipo: 'banco', saldoInicial: 12345 })
    semVazios(r)
    expect(montarRenda({ opcoes, sel: {}, ids, saldoDigitos: '' }).fontes).toEqual([])
  })
})

describe('montarPagamento, planos e remoção', () => {
  it('parcela é fixa, antecipação é variável; sempre saída paga ligada ao contrato', () => {
    const base = { id: 'p1', valor: 31200, data: '2026-10-05', categoriaId: 'outros', contaId: 'c1', descricao: 'Parcela 1 · Carro', financiamentoId: 'fin' }
    const p = montarPagamento({ ...base, tipo: 'parcela' })
    expect(p).toEqual({
      id: 'p1', valor: 31200, data: '2026-10-05', tipo: 'saida', categoriaId: 'outros', natureza: 'fixo', contaId: 'c1',
      status: 'pago', descricao: 'Parcela 1 · Carro', financiamentoId: 'fin', pagamentoFinanciamento: 'parcela',
    })
    const a = montarPagamento({ ...base, tipo: 'antecipacao' })
    expect(a.natureza).toBe('variavel')
    expect(a.pagamentoFinanciamento).toBe('antecipacao')
    semVazios([p, a])
  })
  it('sobraLivre devolve o plano desta dívida à sobra otimizada, nunca negativa', () => {
    // sobra otimizada 40.000 com plano desta dívida de 25.000 => 65.000 livres
    expect(sobraLivre(40000, { aporteExtraMensal: 25000 })).toBe(65000)
    expect(sobraLivre(40000, undefined)).toBe(40000)
    expect(sobraLivre(-10000, { aporteExtraMensal: 3000 })).toBe(0)
  })
  it('montarPlano: aporte zero não gera plano', () => {
    expect(montarPlano({ id: 'p', financiamentoId: 'f', aporte: 0, efeito: 'reduzir_prazo' })).toBeUndefined()
    const p = montarPlano({ id: 'p', financiamentoId: 'f', aporte: 50000, efeito: 'reduzir_parcela' })
    expect(p).toEqual({ id: 'p', financiamentoId: 'f', aporteExtraMensal: 50000, efeito: 'reduzir_parcela' })
    semVazios(p)
  })

  const l = (p: Partial<Lancamento>): Lancamento => ({
    id: 'x', valor: 100, data: '2026-10-05', tipo: 'saida', categoriaId: 'outros', natureza: 'fixo', contaId: 'c1', status: 'pago', ...p,
  })
  it('remover contrato: pendentes saem; pagos viram despesa comum sem vínculo; outros contratos ficam', () => {
    const lancs = [
      l({ id: 'pago', financiamentoId: 'f', pagamentoFinanciamento: 'parcela', descricao: 'P1' }),
      l({ id: 'pend', financiamentoId: 'f', pagamentoFinanciamento: 'parcela', status: 'pendente' }),
      l({ id: 'outro', financiamentoId: 'g', pagamentoFinanciamento: 'parcela' }),
      l({ id: 'comum' }),
    ]
    const r = desvincularContrato('f', lancs)
    expect(r.excluirIds).toEqual(['pend'])
    expect(r.reescrever).toEqual([l({ id: 'pago', descricao: 'P1' })])
    expect('financiamentoId' in r.reescrever[0]).toBe(false)
    expect('pagamentoFinanciamento' in r.reescrever[0]).toBe(false)
    semVazios(r.reescrever)
  })
  it('excluir lançamento: um id; transferência leva as duas pontas', () => {
    const [s, e] = montarTransferencia({ id: 't', origemId: 'c1', destinoId: 'c2', valorDigitos: '100', data: '2026-10-19', descricao: '' })
    const lancs = [l({ id: 'a' }), s, e]
    expect(idsDeExclusao(lancs[0], lancs)).toEqual(['a'])
    expect(idsDeExclusao(s, lancs).sort()).toEqual(['t:entrada', 't:saida'])
    expect(idsDeExclusao(e, lancs).sort()).toEqual(['t:entrada', 't:saida'])
    expect(idsDeExclusao(s, [])).toEqual(['t:saida']) // ponta isolada: ainda apaga a si mesma
  })
})
