import { describe, it, expect } from 'vitest'
import { topCategorias } from './categorias'
import type { Lancamento } from './tipos'

const f1 = { id: 'f1' }

const s = (categoriaId: string, valor: number, data = '2026-10-05'): Lancamento => ({
  id: categoriaId + valor + data, valor, data, tipo: 'saida', categoriaId,
  natureza: 'variavel', contaId: 'c', status: 'pago',
})

describe('topCategorias', () => {
  const ls = [s('mer', 6000), s('alu', 3000), s('mer', 1000), s('mer', 9999, '2026-09-01')]
  it('agrupa, ordena e calcula percentual do mês', () => {
    expect(topCategorias(ls, [], '2026-10', 5)).toEqual([
      { categoriaId: 'mer', total: 7000, pct: 70 },
      { categoriaId: 'alu', total: 3000, pct: 30 },
    ])
  })
  it('respeita o limite n', () => expect(topCategorias(ls, [], '2026-10', 1)).toHaveLength(1))
  it('mês sem saídas devolve lista vazia', () => expect(topCategorias(ls, [], '2026-11', 3)).toEqual([]))
  it('ignora transferência e ajuste', () => {
    const internos: Lancamento[] = [
      { ...s('transferencia', 50000), especie: 'transferencia' },
      { ...s('ajuste', 5000), especie: 'ajuste' },
    ]
    expect(topCategorias([...ls, ...internos], [], '2026-10', 5)).toEqual(topCategorias(ls, [], '2026-10', 5))
  })
  it('ignora entradas', () => {
    const entrada: Lancamento = { ...s('sal', 500000), tipo: 'entrada' }
    expect(topCategorias([...ls, entrada], [], '2026-10', 5)).toEqual(topCategorias(ls, [], '2026-10', 5))
  })
  it('ignora pagamento de financiamento existente, mas não o de financiamento apagado', () => {
    const pagamento: Lancamento = { ...s('moradia', 95000), financiamentoId: 'f1' }
    expect(topCategorias([...ls, pagamento], [f1], '2026-10', 5)).toEqual(topCategorias(ls, [f1], '2026-10', 5))
    const orfao: Lancamento = { ...s('moradia', 20000), financiamentoId: 'apagado' }
    expect(topCategorias([...ls, orfao], [f1], '2026-10', 5)).toEqual([
      { categoriaId: 'moradia', total: 20000, pct: 67 },
      { categoriaId: 'mer', total: 7000, pct: 23 },
      { categoriaId: 'alu', total: 3000, pct: 10 },
    ])
  })
})
