import type { Categoria, Conta, Mes, Natureza } from '../domain/tipos'

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

const NATUREZAS: Record<Natureza, string> = { fixo: 'Fixo', variavel: 'Variável' }
const TIPOS_CONTA: Record<Conta['tipo'], string> = { banco: 'Banco', caixa: 'Caixa', carteira: 'Carteira' }

/** 'fixo' -> 'Fixo', 'variavel' -> 'Variável' (nunca o valor cru do banco na tela). */
export const rotuloNatureza = (n: Natureza): string => NATUREZAS[n]
/** 'banco' -> 'Banco', 'caixa' -> 'Caixa', 'carteira' -> 'Carteira'. */
export const rotuloTipoConta = (t: Conta['tipo']): string => TIPOS_CONTA[t]
