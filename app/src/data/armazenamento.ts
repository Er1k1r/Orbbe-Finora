export type EstadoArmazenamento = 'persistente' | 'nao_persistente' | 'indisponivel'
interface NavLike { storage?: { persist?: () => Promise<boolean>; persisted?: () => Promise<boolean> } }

export async function pedirPersistencia(nav: NavLike | undefined = globalThis.navigator as NavLike | undefined): Promise<EstadoArmazenamento> {
  const s = nav?.storage
  if (!s?.persist || !s.persisted) return 'indisponivel'
  if (await s.persisted()) return 'persistente'
  return (await s.persist()) ? 'persistente' : 'nao_persistente'
}
