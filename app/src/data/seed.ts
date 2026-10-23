import type { Categoria } from '../domain/tipos'
import { db } from './db'

const s = (id: string, nome: string, icone: string, natureza: 'fixo' | 'variavel', essencial: boolean): Categoria =>
  ({ id, nome, icone, tipo: 'saida', natureza, essencial })
const e = (id: string, nome: string, icone: string): Categoria =>
  ({ id, nome, icone, tipo: 'entrada', natureza: 'variavel', essencial: false })

const sis = (id: string, nome: string, icone: string): Categoria =>
  ({ id, nome, icone, tipo: 'saida', natureza: 'variavel', essencial: false, sistema: true })

export const CATEGORIAS_PADRAO: Categoria[] = [
  s('moradia', 'Moradia', 'House', 'fixo', true),
  s('alimentacao', 'Alimentação', 'ForkKnife', 'variavel', true),
  s('mercado', 'Mercado', 'ShoppingCart', 'variavel', true),
  s('veiculo', 'Veículo / Combustível', 'GasPump', 'variavel', true),
  s('transporte', 'Transporte', 'Bus', 'variavel', true),
  s('saude', 'Saúde', 'Heartbeat', 'variavel', true),
  s('contas', 'Contas (luz, água, internet)', 'Lightning', 'fixo', true),
  s('educacao', 'Educação', 'GraduationCap', 'fixo', false),
  s('lazer', 'Lazer', 'FilmSlate', 'variavel', false),
  s('compras', 'Compras', 'Bag', 'variavel', false),
  s('investimentos', 'Investimentos', 'ChartLineUp', 'variavel', false),
  s('outros', 'Outros', 'DotsThree', 'variavel', false),
  e('salario', 'Salário', 'Wallet'),
  e('vendas', 'Vendas', 'Storefront'),
  e('extras', 'Extras e bicos', 'Hammer'),
  e('rendimentos', 'Rendimentos', 'TrendUp'),
  sis('transferencia', 'Transferência', 'ArrowsLeftRight'),
  sis('ajuste', 'Ajuste de saldo', 'Scales'),
]

export async function semearCategorias(): Promise<void> {
  if ((await db.categorias.count()) === 0) {
    await db.categorias.bulkPut(CATEGORIAS_PADRAO)
    return
  }
  const existentes = new Set((await db.categorias.toArray()).map((c) => c.id))
  const faltam = CATEGORIAS_PADRAO.filter((c) => c.sistema && !existentes.has(c.id))
  if (faltam.length > 0) await db.categorias.bulkPut(faltam)
}
