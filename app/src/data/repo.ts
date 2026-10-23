import type { Table } from 'dexie'
import { db } from './db'

function criar<T extends { id: string }>(t: Table<T, string>) {
  return {
    listar: () => t.toArray(),
    obter: (id: string) => t.get(id),
    salvar: async (x: T) => { await t.put(x) },
    remover: (id: string) => t.delete(id),
  }
}

export const repo = {
  contas: criar(db.contas),
  fontes: criar(db.fontes),
  categorias: criar(db.categorias),
  lancamentos: criar(db.lancamentos),
  financiamentos: criar(db.financiamentos),
  planos: criar(db.planos),
}

export const novoId = () => crypto.randomUUID()
