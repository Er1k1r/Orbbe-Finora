import type { Table } from 'dexie'
import { db } from './db'

const VERSAO = 1
const TABELAS = ['contas', 'fontes', 'categorias', 'lancamentos', 'financiamentos', 'planos'] as const

export async function exportar(): Promise<string> {
  const dados: Record<string, unknown> = { versao: VERSAO }
  for (const t of TABELAS) dados[t] = await db[t].toArray()
  return JSON.stringify(dados)
}

const INVALIDO = 'Arquivo de backup inválido'

function validar(json: string): Record<(typeof TABELAS)[number], object[]> {
  let dados: unknown
  try { dados = JSON.parse(json) } catch { throw new Error(INVALIDO) }
  if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) throw new Error(INVALIDO)
  const obj = dados as Record<string, unknown>
  if (obj.versao !== VERSAO) throw new Error('Versão de backup não suportada')
  for (const t of TABELAS) {
    const linhas = obj[t]
    if (!Array.isArray(linhas)) throw new Error(INVALIDO)
    for (const l of linhas) {
      if (typeof l !== 'object' || l === null || Array.isArray(l)) throw new Error(INVALIDO)
      if (typeof (l as { id?: unknown }).id !== 'string') throw new Error(INVALIDO)
    }
  }
  return obj as Record<(typeof TABELAS)[number], object[]>
}

export async function importar(json: string): Promise<void> {
  const dados = validar(json)
  await db.transaction('rw', TABELAS.map((t) => db[t]), async () => {
    for (const t of TABELAS) {
      const tabela = db[t] as Table<object, string>
      await tabela.clear()
      await tabela.bulkPut(dados[t])
    }
  })
}
