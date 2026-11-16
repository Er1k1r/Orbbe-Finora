/**
 * Editor de lançamento: o que pode mudar em cada tipo de linha e as linhas a gravar. Puro (sem Dexie/React).
 * Regra de sempre: campos opcionais só entram com valor (nunca `undefined` gravado) e a data tem de existir no calendário.
 */
import type { Centavos, Lancamento, Natureza, StatusLancamento } from '../domain/tipos'
import { mesDe } from '../domain/meses'
import { dataReal } from './validacao'

export interface CamposEdicao {
  descricao: string
  valor: Centavos
  data: string
  categoriaId: string
  contaId: string
  status: StatusLancamento
  natureza: Natureza
  observacao: string
}

export const camposDe = (l: Lancamento): CamposEdicao => ({
  descricao: l.descricao ?? '', valor: l.valor, data: l.data, categoriaId: l.categoriaId, contaId: l.contaId,
  status: l.status, natureza: l.natureza, observacao: l.observacao ?? '',
})

/** O que a tela pode oferecer para esta linha. */
export function podeEditar(l: Lancamento) {
  const transferencia = l.transferenciaId !== undefined
  return {
    editavel: l.especie !== 'ajuste', // ajuste de conferência nasce do saldo real: refaça pelo Conferir saldo
    categoria: !transferencia && l.financiamentoId === undefined,
    conta: !transferencia,
    natureza: !transferencia && l.financiamentoId === undefined,
    modelo: l.recorrencia === 'mensal', // mês fixo: a recorrência é gerada a partir dele
  }
}

export type ResultadoEdicao = { salvar: Lancamento[] } | { erro: string }

const comOpcional = (l: Lancamento, k: 'descricao' | 'observacao', v: string): Lancamento => {
  const copia: Lancamento = { ...l }
  const texto = v.trim()
  if (texto) copia[k] = texto
  else delete copia[k]
  return copia
}

/** Aplica os campos editados sobre `original`; transferência leva as duas pontas junto (valor, data, status e textos). */
export function aplicarEdicao(original: Lancamento, c: CamposEdicao, todos: Lancamento[]): ResultadoEdicao {
  const pode = podeEditar(original)
  if (!pode.editavel) return { erro: 'Ajustes de saldo não podem ser editados.' }
  if (!Number.isSafeInteger(c.valor) || c.valor <= 0) return { erro: 'Informe um valor maior que zero.' }
  if (!dataReal(c.data)) return { erro: 'Informe uma data válida.' }
  if (pode.modelo && mesDe(c.data) !== mesDe(original.data)) {
    return { erro: 'Um lançamento que se repete mantém o mês: altere só o dia, ou crie outro para mudar de mês.' }
  }
  const base = (l: Lancamento): Lancamento => {
    let r: Lancamento = { ...l, valor: c.valor, data: c.data, status: c.status }
    r = comOpcional(r, 'descricao', c.descricao)
    r = comOpcional(r, 'observacao', c.observacao)
    return r
  }
  if (original.transferenciaId !== undefined) {
    const pontas = todos.filter((l) => l.transferenciaId === original.transferenciaId)
    return { salvar: (pontas.length > 0 ? pontas : [original]).map(base) }
  }
  let r = base(original)
  if (pode.categoria) r = { ...r, categoriaId: c.categoriaId }
  if (pode.natureza) r = { ...r, natureza: c.natureza }
  if (pode.conta) r = { ...r, contaId: c.contaId }
  return { salvar: [r] }
}
