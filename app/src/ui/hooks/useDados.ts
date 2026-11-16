import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import type { Categoria, TipoLancamento } from '../../domain/tipos'

export { useDados } from './DadosContext' // DadosContext só importa o TIPO daqui: sem ciclo em tempo de execução

export function useDadosAoVivo() {
  const contas = useLiveQuery(() => db.contas.toArray())
  const fontes = useLiveQuery(() => db.fontes.toArray())
  const categorias = useLiveQuery(() => db.categorias.toArray())
  const lancamentos = useLiveQuery(() => db.lancamentos.toArray())
  const financiamentos = useLiveQuery(() => db.financiamentos.toArray())
  const planos = useLiveQuery(() => db.planos.toArray())
  const pronto = [contas, fontes, categorias, lancamentos, financiamentos, planos].every((x) => x !== undefined)
  return {
    pronto,
    contas: contas ?? [], fontes: fontes ?? [], categorias: categorias ?? [],
    lancamentos: lancamentos ?? [], financiamentos: financiamentos ?? [], planos: planos ?? [],
  }
}

/** Categorias da grade de lançamento e das telas de gestão: as de sistema (transferência, ajuste) nunca aparecem. */
export const categoriasDaGrade = (categorias: Categoria[], tipo?: TipoLancamento): Categoria[] =>
  categorias.filter((c) => !c.sistema && (tipo === undefined || c.tipo === tipo))
