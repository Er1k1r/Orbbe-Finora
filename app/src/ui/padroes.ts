import type { Conta } from '../domain/tipos'

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
