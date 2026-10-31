import type { Conta, Lancamento } from '../domain/tipos'

/**
 * Conta padrão dos formulários: a preferida (`contaPadraoId`) se ainda existir; senão a primeira que NÃO é
 * reserva, por nome (pt-BR); senão a primeira por nome. A ordem do banco (UUID) nunca decide.
 */
export function contaPadrao(contas: Conta[], contaPadraoId: string | undefined): Conta | undefined {
  const preferida = contas.find((c) => c.id === contaPadraoId)
  if (preferida) return preferida
  const porNome = [...contas].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  return porNome.find((c) => !c.reserva) ?? porNome[0]
}

/** Onboarding só num app realmente vazio: sem contas, fontes, lançamentos nem financiamentos. */
export const appVazio = (d: { contas: unknown[]; fontes: unknown[]; lancamentos: unknown[]; financiamentos: unknown[] }): boolean =>
  d.contas.length === 0 && d.fontes.length === 0 && d.lancamentos.length === 0 && d.financiamentos.length === 0

/** Motivo (pt-BR) para NÃO remover a categoria; `undefined` quando pode. */
export function bloqueioRemoverCategoria(id: string, lancs: Pick<Lancamento, 'categoriaId'>[]): string | undefined {
  if (id === 'outros') return 'Essa categoria é usada nos pagamentos de financiamento e não pode ser removida.'
  if (lancs.some((l) => l.categoriaId === id)) return 'Esta categoria tem lançamentos.'
  return undefined
}
