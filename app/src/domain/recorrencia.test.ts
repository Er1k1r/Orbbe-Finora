import { describe, it, expect } from 'vitest'
import { gerarRecorrentes } from './recorrencia'
import type { Lancamento } from './tipos'

const modelo: Lancamento = {
  id: 'm1', valor: 150000, data: '2026-08-05', tipo: 'saida', categoriaId: 'mor',
  natureza: 'fixo', contaId: 'c', status: 'pago', recorrencia: 'mensal',
}
const idGen = (() => { let n = 0; return () => `g${++n}` })()

describe('gerarRecorrentes', () => {
  it('gera meses faltantes como pendentes', () => {
    const novos = gerarRecorrentes([modelo], '2026-10-19', idGen)
    expect(novos.map((n) => n.data)).toEqual(['2026-09-05', '2026-10-05'])
    expect(novos.every((n) => n.origemId === 'm1' && n.status === 'pendente' && !n.recorrencia)).toBe(true)
  })
  it('é idempotente', () => {
    const novos = gerarRecorrentes([modelo], '2026-10-19', idGen)
    expect(gerarRecorrentes([modelo, ...novos], '2026-10-19', idGen)).toEqual([])
  })
  it('ajusta dia 31 em mês curto', () => {
    const m = { ...modelo, data: '2026-01-31' }
    const novos = gerarRecorrentes([m], '2026-02-28', idGen)
    expect(novos.map((n) => n.data)).toEqual(['2026-02-28'])
  })
})
