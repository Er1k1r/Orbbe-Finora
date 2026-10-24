import { describe, it, expect } from 'vitest'
import { rendaEsperada, reservaAlvoMeses } from './renda'
import type { FonteDeRenda, Lancamento } from './tipos'

const fonte = (p: Partial<FonteDeRenda>): FonteDeRenda => ({
  id: 'f', nome: 'F', tipo: 'fixa', valorEsperado: 0, ...p,
})
const ent = (fonteId: string, data: string, valor: number): Lancamento => ({
  id: data + valor, valor, data, tipo: 'entrada', categoriaId: 'r', natureza: 'variavel',
  contaId: 'c', fonteId, status: 'pago',
})

describe('rendaEsperada', () => {
  it('fixa usa valor cadastrado, eventual zero', () => {
    const fontes = [fonte({ id: 'a', valorEsperado: 500000 }), fonte({ id: 'b', tipo: 'eventual', valorEsperado: 90000 })]
    expect(rendaEsperada(fontes, [], '2026-10')).toBe(500000)
  })
  it('variável usa min(média, mediana) dos 3 meses anteriores', () => {
    const fontes = [fonte({ id: 'v', tipo: 'variavel', valorEsperado: 300000 })]
    const ls = [ent('v', '2026-07-05', 100000), ent('v', '2026-08-05', 100000), ent('v', '2026-09-05', 400000)]
    // média 200000, mediana 100000 → 100000
    expect(rendaEsperada(fontes, ls, '2026-10')).toBe(100000)
  })
  it('variável sem histórico cai no valor esperado', () => {
    const fontes = [fonte({ id: 'v', tipo: 'variavel', valorEsperado: 300000 })]
    expect(rendaEsperada(fontes, [], '2026-10')).toBe(300000)
  })
})

describe('rendaEsperada: histórico da renda variável', () => {
  const v = [fonte({ id: 'v', tipo: 'variavel', valorEsperado: 300000 })]
  it('meses vazios depois do primeiro recebimento contam como zero', () => {
    // janela [jul 300000, ago 0, set 0]: média 100000, mediana 0 → 0
    expect(rendaEsperada(v, [ent('v', '2026-07-05', 300000)], '2026-10')).toBe(0)
  })
  it('meses antes do primeiro recebimento ficam fora da janela', () => {
    // janela [set 90000] → 90000
    expect(rendaEsperada(v, [ent('v', '2026-09-05', 90000)], '2026-10')).toBe(90000)
  })
  it('entrada pendente (não recebida) é ignorada', () => {
    const pendente = { ...ent('v', '2026-09-05', 90000), status: 'pendente' as const }
    expect(rendaEsperada(v, [pendente], '2026-10')).toBe(300000)
  })
  it('entradas de outra fonte não vazam', () => {
    const ls = [ent('outra', '2026-07-05', 999999), ent('v', '2026-09-05', 90000)]
    expect(rendaEsperada(v, ls, '2026-10')).toBe(90000)
  })
  it('recebimentos do próprio mês ou posteriores não entram no histórico', () => {
    expect(rendaEsperada(v, [ent('v', '2026-10-05', 90000)], '2026-10')).toBe(300000)
  })
})

describe('reservaAlvoMeses', () => {
  it('fixa dominante → 6', () => {
    expect(reservaAlvoMeses([fonte({ valorEsperado: 600000 }), fonte({ id: 'v', tipo: 'variavel', valorEsperado: 200000 })])).toBe(6)
  })
  it('variável dominante → 12', () => {
    expect(reservaAlvoMeses([fonte({ valorEsperado: 100000 }), fonte({ id: 'v', tipo: 'variavel', valorEsperado: 400000 })])).toBe(12)
  })
  it('exatamente 50% fixa → 6', () => {
    expect(reservaAlvoMeses([fonte({ valorEsperado: 500000 }), fonte({ id: 'v', tipo: 'variavel', valorEsperado: 500000 })])).toBe(6)
  })
  it('sem fontes → 12', () => expect(reservaAlvoMeses([])).toBe(12))
})

describe('movimentos internos em renda e custo essencial', () => {
  it('transferência de entrada não conta no histórico da fonte variável', () => {
    const fontes = [fonte({ id: 'v', tipo: 'variavel', valorEsperado: 300000 })]
    const ls = [{ ...ent('v', '2026-09-05', 900000), especie: 'transferencia' as const }]
    expect(rendaEsperada(fontes, ls, '2026-10')).toBe(300000)
  })
})
