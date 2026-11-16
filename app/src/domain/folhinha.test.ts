import { describe, it, expect } from 'vitest'
import { casasDoMes, eventosDoMes, semanaDe } from './folhinha'
import type { Financiamento, Lancamento } from './tipos'

const l = (p: Partial<Lancamento>): Lancamento => ({
  id: 'x', valor: 1000, data: '2026-11-10', tipo: 'saida', categoriaId: 'mercado', natureza: 'variavel', contaId: 'c1', status: 'pago', ...p,
})
const nome = (id: string) => ({ mercado: 'Mercado', salario: 'Salário' })[id] ?? id
const fin: Financiamento = {
  id: 'f1', nome: 'Carro', valorFinanciado: 100000, valorParcela: 25000, totalParcelas: 4, sistema: 'SAC',
  taxaMensal: 0, primeiraParcela: '2026-09-30', parcelasPagasAntes: 1,
}

describe('eventosDoMes', () => {
  it('junta lançamentos, previstos e parcelas, com situação pelo dia de hoje', () => {
    const ls = [
      l({ id: 'a', data: '2026-11-03', status: 'pendente' }), // venceu antes de hoje
      l({ id: 'b', data: '2026-11-20', status: 'pendente', descricao: 'Luz' }), // ainda vai vencer
      l({ id: 's', tipo: 'entrada', categoriaId: 'salario', data: '2026-11-05' }),
      l({ id: 't', especie: 'transferencia', transferenciaId: 't', data: '2026-11-06' }), // fora
      l({ id: 'pg', financiamentoId: 'f1', pagamentoFinanciamento: 'parcela', data: '2026-10-30', valor: 25000 }),
      l({ id: 'm', data: '2026-10-25', recorrencia: 'mensal', geradoAte: '2026-10', descricao: 'Internet', valor: 9900 }),
    ]
    const e = eventosDoMes(ls, [fin], '2026-11', '2026-11-16', nome)
    expect(e.map((x) => [x.data, x.nome, x.situacao, x.origem])).toEqual([
      ['2026-11-03', 'Mercado', 'vencido', 'lancamento'],
      ['2026-11-05', 'Salário', 'pago', 'lancamento'],
      ['2026-11-20', 'Luz', 'aberto', 'lancamento'],
      ['2026-11-25', 'Internet', 'aberto', 'previsto'],
      // parcela 2 (out) paga pelo lançamento; a 3 vence em 30/11 e segue aberta
      ['2026-11-30', 'Carro 3/4', 'aberto', 'parcela'],
    ])
  })

  it('dia de vencimento maior que o mês cai no último dia', () => {
    const f = { ...fin, primeiraParcela: '2026-01-31', parcelasPagasAntes: 0, totalParcelas: 3 }
    expect(eventosDoMes([], [f], '2026-02', '2026-01-01', nome)[0].data).toBe('2026-02-28')
  })
})

describe('casasDoMes e semanaDe', () => {
  it('novembro de 2026 começa num domingo e fecha 5 semanas', () => {
    const c = casasDoMes('2026-11')
    expect(c[0]).toBe('2026-11-01')
    expect(c).toHaveLength(35)
    expect(c[30]).toBeNull()
  })
  it('semana de domingo a sábado, atravessando o mês', () => {
    expect(semanaDe('2026-12-01')).toEqual(['2026-11-29', '2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05'])
  })
})
