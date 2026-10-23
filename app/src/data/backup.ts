import type { Table } from 'dexie'
import { db } from './db'

const VERSAO = 1
const TABELAS = ['contas', 'fontes', 'categorias', 'lancamentos', 'financiamentos', 'planos'] as const

export async function exportar(): Promise<string> {
  const dados: Record<string, unknown> = { versao: VERSAO }
  for (const t of TABELAS) dados[t] = await db[t].toArray()
  return JSON.stringify(dados)
}

export async function importar(json: string): Promise<void> {
  let dados: Record<string, unknown>
  try { dados = JSON.parse(json) } catch { throw new Error('Arquivo de backup inválido') }
  if (typeof dados !== 'object' || dados === null) throw new Error('Arquivo de backup inválido')
  if (dados.versao !== VERSAO) throw new Error('Versão de backup não suportada')
  await db.transaction('rw', TABELAS.map((t) => db[t]), async () => {
    for (const t of TABELAS) {
      const tabela = db[t] as Table<object, string>
      await tabela.clear()
      await tabela.bulkPut((dados[t] as object[] | undefined) ?? [])
    }
  })
}
