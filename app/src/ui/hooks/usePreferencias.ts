import { useSyncExternalStore } from 'react'

export type Objetivo = 'destino' | 'nao_estourar' | 'contas_em_dia' | 'meta'
export interface Prefs { objetivos: Objetivo[]; checklistFechado: boolean; semFinanciamento: boolean; contaPadraoId?: string }

const CHAVE = 'financas.prefs'
const PADRAO: Prefs = { objetivos: [], checklistFechado: false, semFinanciamento: false }
const ouvintes = new Set<() => void>()
let cache: Prefs | null = null

function ler(): Prefs {
  if (cache) return cache
  try { cache = { ...PADRAO, ...JSON.parse(localStorage.getItem(CHAVE) ?? '{}') } } catch { cache = PADRAO }
  return cache as Prefs
}
export function salvarPrefs(p: Partial<Prefs>) {
  cache = { ...ler(), ...p }
  try { localStorage.setItem(CHAVE, JSON.stringify(cache)) } catch { /* modo privado: segue em memória */ }
  ouvintes.forEach((f) => f())
}
export const usePrefs = () =>
  useSyncExternalStore((f) => { ouvintes.add(f); return () => { ouvintes.delete(f) } }, ler)
