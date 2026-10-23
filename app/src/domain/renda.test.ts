import { describe, it, expect } from 'vitest'
import { rendaEsperada, reservaAlvoMeses, custoEssencial } from './renda'
import type { Categoria, FonteDeRenda, Lancamento } from './tipos'

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

describe('reservaAlvoMeses', () => {
  it('fixa dominante → 6', () => {
    expect(reservaAlvoMeses([fonte({ valorEsperado: 600000 }), fonte({ id: 'v', tipo: 'variavel', valorEsperado: 200000 })])).toBe(6)
  })
  it('variável dominante → 12', () => {
    expect(reservaAlvoMeses([fonte({ valorEsperado: 100000 }), fonte({ id: 'v', tipo: 'variavel', valorEsperado: 400000 })])).toBe(12)
  })
  it('sem fontes → 12', () => expect(reservaAlvoMeses([])).toBe(12))
})

describe('custoEssencial', () => {
  const cats: Categoria[] = [
    { id: 'mor', nome: 'Moradia', icone: 'house', tipo: 'saida', natureza: 'fixo', essencial: true },
    { id: 'laz', nome: 'Lazer', icone: 'film', tipo: 'saida', natureza: 'variavel', essencial: false },
  ]
  const s = (categoriaId: string, data: string, valor: number): Lancamento => ({
    id: categoriaId + data, valor, data, tipo: 'saida', categoriaId, natureza: 'fixo',
    contaId: 'c', status: 'pago',
  })
  it('média das saídas essenciais mais parcelas', () => {
    const ls = [s('mor', '2026-09-01', 100000), s('mor', '2026-10-01', 120000), s('laz', '2026-10-02', 50000)]
    expect(custoEssencial(ls, cats, 30000, '2026-10')).toBe(110000 + 30000)
  })
})
