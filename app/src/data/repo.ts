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

/** UUID v4; usa randomUUID quando existe e cai para getRandomValues (nunca Math.random). */
export function novoId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
