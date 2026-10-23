import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'
import { repo } from './repo'
import { exportar, importar } from './backup'

beforeEach(async () => { await db.delete(); await db.open() })

describe('backup', () => {
  it('exporta e importa', async () => {
    await repo.contas.salvar({ id: 'c1', nome: 'Banco', tipo: 'banco', saldoInicial: 1000 })
    const json = await exportar()
    await db.delete(); await db.open()
    await importar(json)
    expect(await repo.contas.listar()).toEqual([{ id: 'c1', nome: 'Banco', tipo: 'banco', saldoInicial: 1000 }])
  })
  it('rejeita JSON inválido e versão desconhecida', async () => {
    await expect(importar('não é json')).rejects.toThrow('Arquivo de backup inválido')
    await expect(importar(JSON.stringify({ versao: 99 }))).rejects.toThrow('Versão de backup não suportada')
  })
})
