import { describe, it, expect } from 'vitest'
import { antecipacaoUltimas, estadoContrato, parcelaNoMes, parcelasAtrasadas, taxaImplicita, validarContrato, type PagamentoContrato } from './contrato'
import type { Contrato } from './tipos'

describe('taxaImplicita', () => {
  it('Price', () => {
    expect(taxaImplicita({ valorFinanciado: 100000, valorParcela: 34002, totalParcelas: 3, sistema: 'PRICE' })).toBeCloseTo(0.01, 4)
    expect(taxaImplicita({ valorFinanciado: 3000000, valorParcela: 95000, totalParcelas: 48, sistema: 'PRICE' })).toBeCloseTo(0.0186, 3)
  })
  it('SAC', () => {
    expect(taxaImplicita({ valorFinanciado: 120000, valorParcela: 31200, totalParcelas: 4, sistema: 'SAC' })).toBeCloseTo(0.01, 10)
  })
  it('null quando não fecha e 0 sem juros', () => {
    expect(taxaImplicita({ valorFinanciado: 100000, valorParcela: 30000, totalParcelas: 3, sistema: 'PRICE' })).toBeNull()
    expect(taxaImplicita({ valorFinanciado: 120000, valorParcela: 29000, totalParcelas: 4, sistema: 'SAC' })).toBeNull()
    expect(taxaImplicita({ valorFinanciado: 120000, valorParcela: 40000, totalParcelas: 3, sistema: 'PRICE' })).toBe(0)
  })
})

const c: Contrato = {
  valorFinanciado: 100000, valorParcela: 34002, totalParcelas: 3, sistema: 'PRICE',
  taxaMensal: 0.01, primeiraParcela: '2026-08-10', parcelasPagasAntes: 1,
}
const pg = (o: Partial<PagamentoContrato>): PagamentoContrato => ({ data: '2026-09-12', valor: 34002, tipo: 'parcela', status: 'pago', ...o })

describe('estadoContrato', () => {
  it('sem pagamentos', () => {
    const e = estadoContrato(c, [])
    expect(e.cronogramaOriginal.map((p) => p.parcela)).toEqual([34002, 34002, 34003])
    expect(e.totalContrato).toBe(102007)
    expect(e.saldoDevedor).toBe(66998)
    expect(e.parcelasPagas).toBe(1)
    expect(e.jurosPagos).toBe(1000)
    expect(e.restantes.map((p) => [p.numero, p.parcela, p.vencimento])).toEqual([
      [2, 34002, '2026-09-10'], [3, 34003, '2026-10-10'],
    ])
    expect(e.jurosAPagar).toBe(1007)
    expect(e.restanteNominal).toBe(68005)
    expect(e.descontoQuitacao).toBe(1007)
  })
  it('com pagamento de parcela', () => {
    const e = estadoContrato(c, [pg({})])
    expect(e.parcelasPagas).toBe(2)
    expect(e.saldoDevedor).toBe(33666)
    expect(e.jurosPagos).toBe(1670)
    expect(e.restantes.map((p) => [p.numero, p.parcela])).toEqual([[3, 34003]])
    expect(e.descontoQuitacao).toBe(337)
  })
  it('ignora pagamento após `ate` e pendente', () => {
    expect(estadoContrato(c, [pg({})], '2026-08-31').parcelasPagas).toBe(1)
    expect(estadoContrato(c, [pg({ status: 'pendente' })]).parcelasPagas).toBe(1)
  })
  it('antecipação encurta o prazo', () => {
    const e = estadoContrato(c, [pg({ data: '2026-09-01', valor: 33333, tipo: 'antecipacao' })])
    expect(e.saldoDevedor).toBe(33665)
    expect(e.restantes.map((p) => [p.numero, p.parcela])).toEqual([[2, 34002]])
    expect(e.antecipado).toBe(33333)
  })
})

describe('antecipacaoUltimas', () => {
  const e = estadoContrato(c, [])
  it('N=1', () => {
    expect(antecipacaoUltimas(e, 0.01, 1)).toEqual({ valor: 33333, nominal: 34003, desconto: 670 })
  })
  it('N=2 = saldo devedor', () => {
    const r = antecipacaoUltimas(e, 0.01, 2)
    expect(r.valor).toBe(66998)
    expect(r.desconto).toBe(1007)
  })
})

describe('parcelaNoMes / parcelasAtrasadas', () => {
  const e = estadoContrato(c, [])
  it('sem pagamentos', () => {
    expect(parcelaNoMes(c, e, '2026-07')).toBe(0)
    expect(parcelaNoMes(c, e, '2026-08')).toBe(34002)
    expect(parcelaNoMes(c, e, '2026-09')).toBe(34002)
    expect(parcelaNoMes(c, e, '2026-10')).toBe(34003)
    expect(parcelaNoMes(c, e, '2026-11')).toBe(0)
    expect(parcelasAtrasadas(e, '2026-10')).toBe(34002)
  })
  it('com antecipação', () => {
    const ea = estadoContrato(c, [pg({ data: '2026-09-01', valor: 33333, tipo: 'antecipacao' })])
    expect(parcelaNoMes(c, ea, '2026-10')).toBe(0)
  })
})

describe('estadoContrato SAC', () => {
  const sac: Contrato = {
    valorFinanciado: 1200000, valorParcela: 112000, totalParcelas: 12, sistema: 'SAC',
    taxaMensal: 0.01, primeiraParcela: '2026-01-10', parcelasPagasAntes: 3,
  }
  const antec = pg({ data: '2026-05-01', valor: 200000, tipo: 'antecipacao' })
  it('antecipação mantém a amortização fixa e encurta o prazo', () => {
    const e = estadoContrato(sac, [antec])
    expect(e.saldoDevedor).toBe(700000)
    expect(e.restantes.map((p) => p.numero)).toEqual([4, 5, 6, 7, 8, 9, 10])
    expect(e.restantes.every((p) => p.amortizacao === 100000)).toBe(true)
    expect(e.restantes[6].parcela).toBe(101000)
  })
  it('parcela regular seguinte', () => {
    const e = estadoContrato(sac, [antec, pg({ data: '2026-06-10', valor: 107000 })])
    expect(e.parcelasPagas).toBe(4)
    expect(e.saldoDevedor).toBe(600000)
    expect(e.restantes[0].numero).toBe(5)
    expect(e.restantes[0].parcela).toBe(106000)
  })
})

describe('regras de pagamento', () => {
  // Um pagamento 'parcela' avança exatamente uma parcela do contrato, qualquer que seja o valor.
  // A UI deve mostrar a parcela do contrato e avisar quando o valor pago diferir.
  it('parcela de 1 centavo equivale à parcela exata', () => {
    const a = estadoContrato(c, [pg({ valor: 1 })])
    const b = estadoContrato(c, [pg({ valor: 34002 })])
    expect(a.saldoDevedor).toBe(b.saldoDevedor)
    expect(a.parcelasPagas).toBe(b.parcelasPagas)
  })
  it('antecipacaoUltimas com N inválido ou grande', () => {
    const e = estadoContrato(c, [])
    const zero = { valor: 0, nominal: 0, desconto: 0 }
    expect(antecipacaoUltimas(e, 0.01, 0)).toEqual(zero)
    expect(antecipacaoUltimas(e, 0.01, -1)).toEqual(zero)
    expect(antecipacaoUltimas(e, 0.01, NaN)).toEqual(zero)
    expect(antecipacaoUltimas(e, 0.01, 99)).toEqual(antecipacaoUltimas(e, 0.01, 2))
  })
})

describe('validarContrato', () => {
  const ok: Contrato = {
    valorFinanciado: 3000000, valorParcela: 95000, totalParcelas: 48, sistema: 'PRICE', taxaMensal: 0.0186,
    primeiraParcela: '2026-01-10', parcelasPagasAntes: 9,
  }
  it('válido', () => expect(validarContrato(ok)).toEqual([]))
  it.each([
    ['valor financiado zero', { valorFinanciado: 0 }],
    ['valor financiado fracionário', { valorFinanciado: 10.5 }],
    ['parcela zero', { valorParcela: 0 }],
    ['total 0', { totalParcelas: 0, parcelasPagasAntes: 0 }],
    ['total 1201', { totalParcelas: 1201 }],
    ['sistema inválido', { sistema: 'Price' as never }],
    ['data inexistente', { primeiraParcela: '2026-02-30' }],
    ['pagas antes negativas', { parcelasPagasAntes: -1 }],
    ['pagas antes acima do total', { parcelasPagasAntes: 49 }],
  ])('%s gera exatamente um problema', (_n, extra) => {
    expect(validarContrato({ ...ok, ...extra })).toHaveLength(1)
  })
  it('parcela pequena demais para o valor financiado', () => {
    expect(validarContrato({ ...ok, valorParcela: 1000 })).toEqual(['O valor da parcela é pequeno demais para esse valor financiado.'])
  })
  it('parcelasPagasAntes igual ao total é válido', () => expect(validarContrato({ ...ok, parcelasPagasAntes: 48 })).toEqual([]))
  it('acumula vários problemas', () => expect(validarContrato({ ...ok, valorFinanciado: 0, totalParcelas: 0, parcelasPagasAntes: 0 }).length).toBe(2))
})

describe('pagas e aplicados', () => {
  it('registram o passo real de cada pagamento, com excesso', () => {
    // Price 100000/34002/3 a 1%: passo #1 = 34002; pagamento de 35000 => excesso 998
    const e = estadoContrato({ ...c, parcelasPagasAntes: 0 }, [pg({ valor: 35000 })])
    expect(e.pagas.map((p) => p.numero)).toEqual([1])
    expect(e.aplicados).toEqual([{ data: '2026-09-12', valor: 35000, numero: 1, valorParcela: 34002, excesso: 998, tipo: 'parcela' }])
  })
  it('parcelasPagasAntes ficam em pagas mas não em aplicados', () => {
    const e = estadoContrato({ ...c, parcelasPagasAntes: 1 }, [])
    expect(e.pagas).toHaveLength(1)
    expect(e.aplicados).toEqual([])
  })
})

describe('pagamento sem parcela para consumir', () => {
  it('antecipação acima do saldo: abate o saldo e o restante vira excesso', () => {
    const s: Contrato = { valorFinanciado: 200000, valorParcela: 102000, totalParcelas: 2, sistema: 'SAC', taxaMensal: 0.01, primeiraParcela: '2026-10-05', parcelasPagasAntes: 0 }
    // após #1 o saldo é 100.000; antecipação de 130.000 => abate 100.000, excesso 30.000
    const e = estadoContrato(s, [pg({ data: '2026-10-05', valor: 102000 }), pg({ data: '2026-10-10', valor: 130000, tipo: 'antecipacao' })])
    expect(e.saldoDevedor).toBe(0)
    expect(e.antecipado).toBe(100000)
    expect(e.aplicados[1]).toEqual({ data: '2026-10-10', valor: 130000, numero: 0, valorParcela: 0, excesso: 30000, tipo: 'antecipacao' })
  })
  // SAC 200000/1%/2: #1 = 100000 + 2000, #2 = 100000 + 1000
  const s: Contrato = { valorFinanciado: 200000, valorParcela: 102000, totalParcelas: 2, sistema: 'SAC', taxaMensal: 0.01, primeiraParcela: '2026-10-05', parcelasPagasAntes: 0 }
  it('terceira parcela paga num contrato de 2 vira excesso integral (numero 0)', () => {
    const e = estadoContrato(s, [pg({ data: '2026-10-05', valor: 102000 }), pg({ data: '2026-11-05', valor: 101000 }), pg({ data: '2026-12-05', valor: 50000 })])
    expect(e.saldoDevedor).toBe(0)
    expect(e.aplicados[2]).toEqual({ data: '2026-12-05', valor: 50000, numero: 0, valorParcela: 0, excesso: 50000, tipo: 'parcela' })
  })
  it('antecipação com saldo zerado vira excesso integral', () => {
    const e = estadoContrato(s, [pg({ data: '2026-10-05', valor: 102000 }), pg({ data: '2026-11-05', valor: 101000 }), pg({ data: '2026-12-10', valor: 30000, tipo: 'antecipacao' })])
    expect(e.aplicados[2]).toEqual({ data: '2026-12-10', valor: 30000, numero: 0, valorParcela: 0, excesso: 30000, tipo: 'antecipacao' })
    expect(e.antecipado).toBe(0)
  })
})
