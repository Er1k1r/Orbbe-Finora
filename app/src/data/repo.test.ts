import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'
import { repo } from './repo'
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
