import Dexie, { type Table } from 'dexie'
import type {
  Categoria, Conta, Financiamento, FonteDeRenda, Lancamento, PlanoAmortizacao,
} from '../domain/tipos'

class FinancasDB extends Dexie {
  contas!: Table<Conta, string>
  fontes!: Table<FonteDeRenda, string>
  categorias!: Table<Categoria, string>
  lancamentos!: Table<Lancamento, string>
  financiamentos!: Table<Financiamento, string>
  planos!: Table<PlanoAmortizacao, string>

  constructor() {
    super('financas')
    this.version(1).stores({
      contas: 'id',
      fontes: 'id',
      categorias: 'id',
      lancamentos: 'id, data, contaId, categoriaId, origemId',
      financiamentos: 'id',
      planos: 'id, financiamentoId',
    })
  }
}

export const db = new FinancasDB()
