import { ehMovimentoInterno, ehPagamentoParcela } from './fluxo'
import { mesDe } from './meses'
import type { Centavos, Financiamento, Lancamento, Mes } from './tipos'

/** Maiores categorias de saída do mês. Fora: transferências, ajustes e pagamentos de financiamento existente. */
export function topCategorias(lancs: Lancamento[], financiamentos: Pick<Financiamento, 'id'>[], mes: Mes, n: number) {
  const ids = new Set(financiamentos.map((f) => f.id))
  const saidas = lancs.filter(
    (l) => l.tipo === 'saida' && !ehMovimentoInterno(l) && !ehPagamentoParcela(l, ids) && mesDe(l.data) === mes,
  )
  const total = saidas.reduce((s, l) => s + l.valor, 0)
  if (total === 0) return []
  const por = new Map<string, Centavos>()
  for (const l of saidas) por.set(l.categoriaId, (por.get(l.categoriaId) ?? 0) + l.valor)
  return [...por]
    .map(([categoriaId, t]) => ({ categoriaId, total: t, pct: Math.round((t / total) * 100) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, n)
}
