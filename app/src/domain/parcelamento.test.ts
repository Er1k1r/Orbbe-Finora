import { describe, it, expect } from 'vitest'
import { criarParcelamento, resumoParcelamento } from './parcelamento'
import type { NovoParcelamento } from './parcelamento'

const base: NovoParcelamento['base'] = {
  descricao: 'Óculos', categoriaId: 'saude', contaId: 'c1', tipo: 'saida', natureza: 'variavel',
}
const entrada: NovoParcelamento = {
  grupoId: 'g1', valorParcela: 5000, total: 12, parcelaAtual: 4,
  dataParcelaAtual: '2026-10-19', statusAtual: 'pago', base,
}

describe('criarParcelamento', () => {
  it('cria da parcela atual até a última', () => {
    const r = criarParcelamento(entrada)
    expect(r).toHaveLength(9)
    expect(r.map((l) => l.id)).toEqual(['g1:4', 'g1:5', 'g1:6', 'g1:7', 'g1:8', 'g1:9', 'g1:10', 'g1:11', 'g1:12'])
    expect(r[0].data).toBe('2026-10-19')
    expect(r[8].data).toBe('2027-06-19')
    expect(r.map((l) => l.data)).toEqual([
      '2026-10-19', '2026-11-19', '2026-12-19', '2027-01-19', '2027-02-19',
      '2027-03-19', '2027-04-19', '2027-05-19', '2027-06-19',
    ])
    expect(r[0].parcelamento).toEqual({ grupoId: 'g1', numero: 4, total: 12 })
    expect(r[8].parcelamento).toEqual({ grupoId: 'g1', numero: 12, total: 12 })
    expect(r[0].status).toBe('pago')
    expect(r.slice(1).every((l) => l.status === 'pendente')).toBe(true)
    expect(r.every((l) => l.valor === 5000 && l.descricao === 'Óculos' && l.categoriaId === 'saude'
      && l.contaId === 'c1' && l.tipo === 'saida')).toBe(true)
  })
  it('respeita o fim do mês no dia 31', () => {
    const r = criarParcelamento({ ...entrada, parcelaAtual: 1, total: 4, dataParcelaAtual: '2026-01-31' })
    expect(r.map((l) => l.data)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'])
  })
  it('statusAtual pendente deixa todas pendentes', () => {
    const r = criarParcelamento({ ...entrada, statusAtual: 'pendente' })
    expect(r.every((l) => l.status === 'pendente')).toBe(true)
  })
  it('parcela atual = total gera uma só', () => {
    expect(criarParcelamento({ ...entrada, parcelaAtual: 12 })).toHaveLength(1)
  })
  it('erros em pt-BR', () => {
    expect(() => criarParcelamento({ ...entrada, total: 1 })).toThrow('Uma compra parcelada precisa de pelo menos 2 parcelas.')
    expect(() => criarParcelamento({ ...entrada, parcelaAtual: 0 })).toThrow('A parcela atual deve estar entre 1 e o total de parcelas.')
    expect(() => criarParcelamento({ ...entrada, parcelaAtual: 13 })).toThrow('A parcela atual deve estar entre 1 e o total de parcelas.')
    expect(() => criarParcelamento({ ...entrada, valorParcela: 0 })).toThrow('O valor da parcela deve ser maior que zero.')
    expect(() => criarParcelamento({ ...entrada, valorParcela: 50.5 })).toThrow('O valor da parcela deve ser maior que zero.')
  })
})

describe('resumoParcelamento', () => {
  it('resume o grupo', () => {
    expect(resumoParcelamento(criarParcelamento(entrada))).toEqual({
      pagas: 1, restantes: 8, valorRestante: 40000, ultimaData: '2027-06-19', total: 12,
    })
  })
  it('ordena por número mesmo desordenado', () => {
    const r = resumoParcelamento([...criarParcelamento(entrada)].reverse())
    expect(r.ultimaData).toBe('2027-06-19')
  })
})
