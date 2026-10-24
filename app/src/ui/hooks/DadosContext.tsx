import { createContext, useContext } from 'react'
import type { EstadoArmazenamento } from '../../data/armazenamento'
import type { useDadosAoVivo } from './useDados'

export type Dados = ReturnType<typeof useDadosAoVivo> & {
  armazenamento?: EstadoArmazenamento
  /** Mês selecionado no cabeçalho ('YYYY-MM'); as telas leem e trocam por aqui. */
  mes: string
  setMes: (m: string) => void
}
export const DadosContext = createContext<Dados | null>(null)

export function useDados(): Dados {
  const d = useContext(DadosContext)
  if (!d) throw new Error('useDados fora do DadosContext')
  return d
}
