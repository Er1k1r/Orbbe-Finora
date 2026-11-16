import { describe, it, expect } from 'vitest'
import { comparativoCategorias, dreMes, movimentoContas, reparticaoSaidas } from './analise'
import { resumoMes } from './fluxo'
import type { Conta, Financiamento, Lancamento } from './tipos'

let n = 0
const l = (p: Partial<Lancamento>): Lancamento => ({
  id: 'l' + n++, valor: 1000, data: '2026-11-10', tipo: 'saida', categoriaId: 'mercado', natureza: 'variavel', contaId: 'c1', status: 'pago', ...p,
})
const fin: Financiamento = {
  id: 'f1', nome: 'Carro', valorFinanciado: 120000, valorParcela: 10000, totalParcelas: 12, sistema: 'SAC',
  taxaMensal: 0, primeiraParcela: '2026-10-05', parcelasPagasAntes: 0,
}

describe('comparativoCategorias', () => {
  it('compara com o mês anterior e marca variação nula sem base', () => {
    const ls = [
      l({ valor: 12600, data: '2026-11-03' }), l({ valor: 10000, data: '2026-10-03' }), // mercado +26%
      l({ categoriaId: 'lazer', valor: 5000, data: '2026-11-04' }), // sem base
      l({ categoriaId: 'saude', valor: 4000, data: '2026-10-04' }), // só no anterior: −100%
      l({ valor: 99999, data: '2026-11-05', especie: 'transferencia', transferenciaId: 't' }), // interno: fora
    ]
    expect(comparativoCategorias(ls, [], '2026-11')).toEqual([
      { categoriaId: 'mercado', atual: 12600, anterior: 10000, variacao: 0.26 },
      { categoriaId: 'lazer', atual: 5000, anterior: 0, variacao: null },
      { categoriaId: 'saude', atual: 0, anterior: 4000, variacao: -1 },
    ])
  })
})

describe('reparticaoSaidas e dreMes', () => {
  const ls = [
    l({ tipo: 'entrada', categoriaId: 'salario', valor: 300000 }),
    l({ valor: 150000, natureza: 'fixo', categoriaId: 'moradia' }), // fixa
    l({ valor: 5000, parcelamento: { grupoId: 'g', numero: 4, total: 12 } }), // parcelada
    l({ valor: 32000 }), // variável
    l({ valor: 10000, financiamentoId: 'f1', pagamentoFinanciamento: 'parcela', data: '2026-10-06' }), // parcela 1 (out)
  ]
  it('separa fixas, parceladas, financiamentos e variáveis, fechando com o resumo', () => {
    const rep = reparticaoSaidas(ls, [fin], '2026-11')
    // nov: parcela 2 do carro em aberto = 10.000
    expect(rep).toEqual({ fixas: 150000, parceladas: 5000, variaveis: 32000, financiamentos: 10000 })
    const r = resumoMes({ mes: '2026-11', contas: [], lancamentos: ls, financiamentos: [fin], aporteExtra: 0 })
    expect(rep.fixas + rep.parceladas + rep.variaveis + rep.financiamentos).toBe(r.despesas + r.parcelas)
  })
  it('DRE: receitas − variáveis − fixas − financiamentos = sobra normal', () => {
    // 300.000 − 32.000 = 268.000; − (150.000 + 5.000) − 10.000 = 103.000; 103.000 / 300.000
    expect(dreMes(ls, [fin], '2026-11')).toEqual({
      receitas: 300000, variaveis: 32000, margem: 268000, fixas: 155000, financiamentos: 10000, resultado: 103000, pct: 103000 / 300000,
    })
  })
})

describe('movimentoContas', () => {
  it('fecha inicial + receitas − despesas + transferências = saldo', () => {
    const contas: Conta[] = [{ id: 'c1', nome: 'Banco', tipo: 'banco', saldoInicial: 50000 }, { id: 'c2', nome: 'Caixa', tipo: 'caixa', saldoInicial: 0 }]
    const ls = [
      l({ valor: 10000, data: '2026-10-20' }), // mês anterior: inicial de nov = 40.000
      l({ tipo: 'entrada', valor: 30000 }),
      l({ valor: 7000 }),
      l({ valor: 9999, status: 'pendente' }), // pendente: fora do movimento, entra no previsto
      l({ valor: 5000, especie: 'transferencia', transferenciaId: 't' }),
      l({ valor: 5000, tipo: 'entrada', contaId: 'c2', especie: 'transferencia', transferenciaId: 't' }),
    ]
    const [b, c] = movimentoContas(contas, ls, '2026-11')
    expect(b).toEqual({ contaId: 'c1', inicial: 40000, receitas: 30000, despesas: 7000, transfEntrada: 0, transfSaida: 5000, saldo: 58000, previsto: 58000 - 9999 })
    expect(c).toMatchObject({ inicial: 0, transfEntrada: 5000, saldo: 5000 })
    expect(b.inicial + b.receitas - b.despesas + b.transfEntrada - b.transfSaida).toBe(b.saldo)
  })
})
