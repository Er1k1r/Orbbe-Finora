import { describe, it, expect } from 'vitest'
import { aplicarEdicao, camposDe, podeEditar } from './edicao'
import { semVazios } from '../test-ajuda'
import type { Lancamento } from '../domain/tipos'

const l = (p: Partial<Lancamento>): Lancamento => ({
  id: 'a', valor: 5000, data: '2026-11-10', tipo: 'saida', categoriaId: 'mercado', natureza: 'variavel', contaId: 'c1', status: 'pago', ...p,
})

describe('aplicarEdicao', () => {
  it('troca valor, data, categoria, conta, status e textos', () => {
    const o = l({ descricao: 'Feira', observacao: 'x' })
    const r = aplicarEdicao(o, { ...camposDe(o), valor: 7550, data: '2026-11-12', categoriaId: 'lazer', contaId: 'c2', status: 'pendente', descricao: ' Cinema ', observacao: '' }, [o])
    expect(r).toEqual({ salvar: [{ id: 'a', valor: 7550, data: '2026-11-12', tipo: 'saida', categoriaId: 'lazer', natureza: 'variavel', contaId: 'c2', status: 'pendente', descricao: 'Cinema' }] })
    if ('salvar' in r) semVazios(r.salvar)
  })

  it('texto vazio remove o campo opcional em vez de gravar undefined', () => {
    const o = l({ descricao: 'Feira' })
    const r = aplicarEdicao(o, { ...camposDe(o), descricao: '   ' }, [o])
    expect('salvar' in r && 'descricao' in r.salvar[0]).toBe(false)
  })

  it('recusa valor zero e data inexistente', () => {
    const o = l({})
    expect(aplicarEdicao(o, { ...camposDe(o), valor: 0 }, [o])).toEqual({ erro: 'Informe um valor maior que zero.' })
    expect(aplicarEdicao(o, { ...camposDe(o), data: '2026-02-30' }, [o])).toEqual({ erro: 'Informe uma data válida.' })
  })

  it('transferência: as duas pontas recebem valor, data e status; conta e categoria ficam', () => {
    const a = l({ id: 'a', especie: 'transferencia', transferenciaId: 't', tipo: 'saida', contaId: 'c1', categoriaId: 'transferencia' })
    const b = l({ id: 'b', especie: 'transferencia', transferenciaId: 't', tipo: 'entrada', contaId: 'c2', categoriaId: 'transferencia' })
    const r = aplicarEdicao(a, { ...camposDe(a), valor: 999, data: '2026-11-11', contaId: 'c9', categoriaId: 'lazer' }, [a, b])
    expect(r).toEqual({ salvar: [
      { ...a, valor: 999, data: '2026-11-11' },
      { ...b, valor: 999, data: '2026-11-11' },
    ] })
  })

  it('pagamento de financiamento mantém categoria e natureza', () => {
    const o = l({ financiamentoId: 'f1', pagamentoFinanciamento: 'parcela', categoriaId: 'outros', natureza: 'fixo' })
    const r = aplicarEdicao(o, { ...camposDe(o), categoriaId: 'lazer', natureza: 'variavel', valor: 6000 }, [o])
    expect(r).toEqual({ salvar: [{ ...o, valor: 6000 }] })
  })

  it('ajuste de saldo não é editável', () => {
    const o = l({ especie: 'ajuste' })
    expect(podeEditar(o).editavel).toBe(false)
    expect(aplicarEdicao(o, camposDe(o), [o])).toEqual({ erro: 'Ajustes de saldo não podem ser editados.' })
  })

  it('lançamento que se repete aceita mudar o dia, não o mês', () => {
    const o = l({ recorrencia: 'mensal', geradoAte: '2026-11' })
    expect(aplicarEdicao(o, { ...camposDe(o), data: '2026-11-25' }, [o])).toEqual({ salvar: [{ ...o, data: '2026-11-25' }] })
    expect('erro' in aplicarEdicao(o, { ...camposDe(o), data: '2026-12-05' }, [o])).toBe(true)
  })
})
