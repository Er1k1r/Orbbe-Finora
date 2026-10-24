import type { Categoria, Mes } from '../domain/tipos'

export const NOMES_MES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

/** 'YYYY-MM' → 'jun/27'. */
export function rotuloMes(mes: Mes): string {
  const [a, m] = mes.split('-').map(Number)
  return `${NOMES_MES[m - 1].slice(0, 3).toLowerCase()}/${String(a).slice(2)}`
}

/**
 * Itens de `projetarCompromissos` usam `descricao ?? observacao ?? categoriaId`: quando o lançamento não tem
 * descrição, `descricao` vem como o id da categoria. Mostre sempre o NOME da categoria.
 */
export const nomeCompromisso = (descricao: string, categorias: Categoria[]): string =>
  categorias.find((c) => c.id === descricao)?.nome ?? descricao
