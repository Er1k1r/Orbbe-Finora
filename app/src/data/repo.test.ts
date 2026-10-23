import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { db } from './db'
import { repo, novoId } from './repo'
import { semearCategorias, CATEGORIAS_PADRAO } from './seed'

beforeEach(async () => { await db.delete(); await db.open() })

describe('repo', () => {
  it('salva, lista e remove contas', async () => {
    await repo.contas.salvar({ id: 'c1', nome: 'Banco', tipo: 'banco', saldoInicial: 1000 })
    expect(await repo.contas.listar()).toHaveLength(1)
    await repo.contas.remover('c1')
    expect(await repo.contas.listar()).toHaveLength(0)
  })
})

describe('seed', () => {
  it('é idempotente', async () => {
    await semearCategorias()
    await semearCategorias()
    expect(await repo.categorias.listar()).toHaveLength(CATEGORIAS_PADRAO.length)
  })
})

describe('novoId', () => {
  afterEach(() => vi.unstubAllGlobals())
  const v4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
  it('usa randomUUID quando disponível', () => expect(novoId()).toMatch(v4))
  it('sem randomUUID, gera UUID v4 único via getRandomValues', () => {
    vi.stubGlobal('crypto', { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) })
    const ids = Array.from({ length: 50 }, () => novoId())
    for (const id of ids) expect(id).toMatch(v4)
    expect(new Set(ids).size).toBe(50)
  })
})
