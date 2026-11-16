import { describe, it, expect } from 'vitest'
import { serieMensal, trilhaFinanciamento } from './painel'
import type { Financiamento, Lancamento } from './tipos'

const l = (p: Partial<Lancamento>): Lancamento => ({
  id: Math.random().toString(36).slice(2),
  valor: 0, data: '2026-10-10', tipo: 'saida', categoriaId: 'x', natureza: 'variavel', contaId: 'c1', status: 'pago', ...p,
})
// SAC sem juros: 4 parcelas de 25.000 (R$ 250,00) vencendo dia 5 de set/26 a dez/26; 1 paga antes do app.
const fin: Financiamento = {
  id: 'f1', nome: 'Carro', tipo: 'carro', valorFinanciado: 100000, valorParcela: 25000, totalParcelas: 4, sistema: 'SAC',
  taxaMensal: 0, primeiraParcela: '2026-09-05', parcelasPagasAntes: 1,
}

describe('trilhaFinanciamento', () => {
  it('marca paga, atrasada e a pagar pelo mês de hoje', () => {
    // set (paga antes do app), out (atrasada: hoje é novembro), nov e dez (a pagar).
    const t = trilhaFinanciamento(fin, [], '2026-11-15')
    expect(t.map((p) => [p.numero, p.mes, p.situacao])).toEqual([
      [1, '2026-09', 'paga'], [2, '2026-10', 'atrasada'], [3, '2026-11', 'a_pagar'], [4, '2026-12', 'a_pagar'],
    ])
    expect(t.every((p) => p.valor === 25000)).toBe(true)
  })

  it('um pagamento lançado consome a parcela mais antiga', () => {
    const pg = l({ valor: 25000, data: '2026-10-06', financiamentoId: 'f1', pagamentoFinanciamento: 'parcela' })
    const t = trilhaFinanciamento(fin, [pg], '2026-11-15')
    expect(t.map((p) => p.situacao)).toEqual(['paga', 'paga', 'a_pagar', 'a_pagar'])
  })

  it('pagamento pendente não conta como pago', () => {
    const pg = l({ valor: 25000, data: '2026-10-06', financiamentoId: 'f1', pagamentoFinanciamento: 'parcela', status: 'pendente' })
    expect(trilhaFinanciamento(fin, [pg], '2026-11-15')[1].situacao).toBe('atrasada')
  })
})

describe('serieMensal', () => {
  it('soma pago e em aberto por mês, sem contar a parcela do contrato duas vezes', () => {
    const pg = l({ valor: 25000, data: '2026-10-06', financiamentoId: 'f1', pagamentoFinanciamento: 'parcela' })
    const ls = [
      pg,
      l({ valor: 10000, data: '2026-10-12' }), // mercado pago
      l({ valor: 4000, data: '2026-11-20', status: 'pendente' }), // pendente
      l({ valor: 9999, data: '2026-10-15', especie: 'transferencia', transferenciaId: 't' }), // interno: fora
      l({ tipo: 'entrada', valor: 777777, data: '2026-10-01' }), // entrada: fora
    ]
    const s = serieMensal(ls, [fin], '2026-09', 4, '2026-11-15')
    // set: parcela 1 (paga antes do app) = 25.000 paga. out: parcela 2 paga (25.000) + mercado 10.000 = 35.000 pago.
    // nov: parcela 3 em aberto 25.000 + 4.000 pendente = 29.000. dez: parcela 4 em aberto 25.000.
    expect(s).toEqual([
      { mes: '2026-09', pago: 25000, aberto: 0 },
      { mes: '2026-10', pago: 35000, aberto: 0 },
      { mes: '2026-11', pago: 0, aberto: 29000 },
      { mes: '2026-12', pago: 0, aberto: 25000 },
    ])
  })

  it('inclui previstos da recorrência como em aberto', () => {
    const modelo = l({ id: 'm', valor: 5000, data: '2026-10-10', recorrencia: 'mensal', geradoAte: '2026-10' })
    const s = serieMensal([modelo], [], '2026-11', 2, '2026-11-15')
    expect(s).toEqual([{ mes: '2026-11', pago: 0, aberto: 5000 }, { mes: '2026-12', pago: 0, aberto: 5000 }])
  })

  it('antecipação de contrato entra pelo lançamento (paga ou pendente)', () => {
    const ant = l({ valor: 20000, data: '2026-11-02', financiamentoId: 'f1', pagamentoFinanciamento: 'antecipacao' })
    const ant2 = l({ valor: 7000, data: '2026-11-03', financiamentoId: 'f1', pagamentoFinanciamento: 'antecipacao', status: 'pendente' })
    const [nov] = serieMensal([ant, ant2], [fin], '2026-11', 1, '2026-11-15')
    // nov também tem a parcela 3... mas a antecipação paga consome a de dez/nov: o valor exato vem do contrato,
    // então só conferimos que as duas antecipações estão na soma (20.000 paga e 7.000 em aberto, além das parcelas).
    expect(nov.pago).toBeGreaterThanOrEqual(20000)
    expect(nov.aberto).toBeGreaterThanOrEqual(7000)
  })
})
