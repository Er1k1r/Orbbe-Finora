/**
 * Construtores puros das linhas gravadas pelas telas (extraídos do código das telas, sem mudar o comportamento).
 * Regra de todos: campos opcionais só entram quando têm valor (nunca `undefined`/`null` gravado), dinheiro em
 * centavos inteiros e datas 'YYYY-MM-DD' reais — o importador de backup rejeita o resto.
 */
import { criarAjuste, criarTransferencia } from '../domain/contas'
import { centavosDeDigitos } from '../domain/dinheiro'
import { criarParcelamento, type NovoParcelamento } from '../domain/parcelamento'
import type {
  Categoria, Centavos, Conta, EfeitoAporte, FonteDeRenda, Lancamento, Natureza, PagamentoFinanciamento,
  PlanoAmortizacao, TipoFonte, TipoLancamento,
} from '../domain/tipos'
import { comSinal } from './valores'

// ---------- Lançamento rápido ----------

export interface EntradaRapida {
  id: string
  tipo: TipoLancamento
  categoria: Pick<Categoria, 'id' | 'natureza'>
  natureza: 'auto' | Natureza // 'auto' = padrão da categoria
  contaId: string
  descricao: string
  observacao: string
  valor: Centavos
  data: string
  pendente: boolean
  fonteId: string // '' = nenhuma
  modo: 'comum' | 'parcelado' | 'financiamento' // já efetivo: entrada é sempre 'comum'
  financiamentoId: string
  pagamento: PagamentoFinanciamento
  repete: boolean
  ate: string // 'AAAA-MM' ou ''
}

/** Campos comuns a todo lançamento do formulário rápido (e à base do parcelamento). */
export function baseRapida(e: EntradaRapida): NovoParcelamento['base'] {
  const desc = e.descricao.trim()
  const obs = e.observacao.trim()
  return {
    tipo: e.tipo, categoriaId: e.categoria.id, natureza: e.natureza === 'auto' ? e.categoria.natureza : e.natureza,
    contaId: e.contaId,
    ...(desc ? { descricao: desc } : {}),
    ...(obs ? { observacao: obs } : {}),
  }
}

/** Lançamento único (comum ou pagamento de financiamento). */
export function montarLancamentoRapido(e: EntradaRapida): Lancamento {
  return {
    ...baseRapida(e), id: e.id, valor: e.valor, data: e.data, status: e.pendente ? 'pendente' : 'pago',
    ...(e.tipo === 'entrada' && e.fonteId ? { fonteId: e.fonteId } : {}), // sem fonte padrão: só quando escolhida
    ...(e.modo === 'financiamento' ? { financiamentoId: e.financiamentoId, pagamentoFinanciamento: e.pagamento } : {}),
    ...(e.repete && e.modo === 'comum' ? { recorrencia: 'mensal' as const, ...(e.ate ? { recorrenciaAte: e.ate } : {}) } : {}),
  }
}

/** Grupo parcelado (parcela atual até a última); lança erro pt-BR se total/parcela atual forem inválidos. */
export function montarParcelado(e: EntradaRapida, grupoId: string, total: number, parcelaAtual: number): Lancamento[] {
  return criarParcelamento({
    grupoId, valorParcela: e.valor, total, parcelaAtual, dataParcelaAtual: e.data,
    statusAtual: e.pendente ? 'pendente' : 'pago', base: baseRapida(e),
  })
}

// ---------- Contas ----------

/** Conta gravada: opcionais (limite, taxa, reserva) só quando preenchidos. `taxa` já é fração (ou undefined). */
export function montarConta(
  edit: Conta,
  e: { saldoDigitos: string; negativo: boolean; limiteDigitos: string; taxa: number | undefined },
): Conta {
  const lim = centavosDeDigitos(e.limiteDigitos)
  const { limiteChequeEspecial: _l, taxaChequeEspecial: _t, reserva: _r, ...base } = edit
  return {
    ...base, nome: edit.nome.trim(), saldoInicial: comSinal(e.saldoDigitos, e.negativo),
    ...(lim > 0 ? { limiteChequeEspecial: lim } : {}),
    ...(e.taxa !== undefined ? { taxaChequeEspecial: e.taxa } : {}),
    ...(edit.reserva ? { reserva: true } : {}),
  }
}

/** Ajuste de conferência de saldo; `null` se o saldo já confere. */
export function montarConferencia(e: {
  id: string; contaId: string; saldoApp: Centavos; realDigitos: string; negativo: boolean; data: string
}): Lancamento | null {
  return criarAjuste({ id: e.id, contaId: e.contaId, saldoApp: e.saldoApp, saldoReal: comSinal(e.realDigitos, e.negativo), data: e.data })
}

/** Par saída/entrada da transferência (lança erro pt-BR para mesma conta ou valor zero). */
export function montarTransferencia(e: {
  id: string; origemId: string; destinoId: string; valorDigitos: string; data: string; descricao: string
}): [Lancamento, Lancamento] {
  const desc = e.descricao.trim()
  return criarTransferencia({
    id: e.id, contaOrigemId: e.origemId, contaDestinoId: e.destinoId, valor: centavosDeDigitos(e.valorDigitos), data: e.data,
    ...(desc ? { descricao: desc } : {}),
  })
}

// ---------- Fontes, categorias, onboarding ----------

/** Fonte gravada: `diaPagamento` só para fonte fixa com dia preenchido (1 a 31). */
export function montarFonte(edit: FonteDeRenda, valorDigitos: string, dia: string): FonteDeRenda {
  const { diaPagamento: _d, ...base } = edit
  return {
    ...base, nome: edit.nome.trim(), valorEsperado: centavosDeDigitos(valorDigitos),
    ...(edit.tipo === 'fixa' && dia ? { diaPagamento: Math.min(31, Math.max(1, Number(dia))) } : {}),
  }
}

/** Categoria gravada: `sistema` nunca é gravado pela tela. */
export function montarCategoria(edit: Categoria): Categoria {
  const { sistema: _s, ...base } = edit
  return { ...base, nome: edit.nome.trim() }
}

/** Fontes e conta criadas pelo onboarding (as fontes marcadas, na ordem de `opcoes`, e a "Conta principal"). */
export function montarRenda(e: {
  opcoes: { tipo: TipoFonte; nome: string }[]
  sel: Record<string, string> // tipo -> dígitos do valor esperado (chave presente = marcada)
  ids: Record<string, string> // 'conta' e um id por tipo
  saldoDigitos: string
}): { fontes: FonteDeRenda[]; conta: Conta } {
  return {
    fontes: e.opcoes.filter((o) => e.sel[o.tipo] !== undefined).map((o) => (
      { id: e.ids[o.tipo], nome: o.nome, tipo: o.tipo, valorEsperado: centavosDeDigitos(e.sel[o.tipo]) }
    )),
    conta: { id: e.ids.conta, nome: 'Conta principal', tipo: 'banco', saldoInicial: centavosDeDigitos(e.saldoDigitos) },
  }
}

// ---------- Financiamento ----------

/** Pagamento de parcela/antecipação (sempre pago): parcela é fixa, antecipação é variável. */
export function montarPagamento(e: {
  id: string; valor: Centavos; data: string; categoriaId: string; contaId: string
  tipo: PagamentoFinanciamento; descricao: string; financiamentoId: string
}): Lancamento {
  return {
    id: e.id, valor: e.valor, data: e.data, tipo: 'saida', categoriaId: e.categoriaId,
    natureza: e.tipo === 'parcela' ? 'fixo' : 'variavel',
    contaId: e.contaId, status: 'pago', descricao: e.descricao,
    financiamentoId: e.financiamentoId, pagamentoFinanciamento: e.tipo,
  }
}

/**
 * Remover um financiamento: pendentes ligados são excluídos; pagos viram despesa comum (sem os campos de vínculo).
 */
export function desvincularContrato(financiamentoId: string, lancs: Lancamento[]): { excluirIds: string[]; reescrever: Lancamento[] } {
  const excluirIds: string[] = []
  const reescrever: Lancamento[] = []
  for (const l of lancs.filter((x) => x.financiamentoId === financiamentoId)) {
    if (l.status === 'pendente') excluirIds.push(l.id)
    else {
      const { financiamentoId: _f, pagamentoFinanciamento: _p, ...comum } = l
      reescrever.push(comum)
    }
  }
  return { excluirIds, reescrever }
}

/** Sobra do mês que pode virar aporte desta dívida: a sobra otimizada já desconta TODOS os planos; devolve o desta. */
export const sobraLivre = (sobraOtimizada: Centavos, plano: Pick<PlanoAmortizacao, 'aporteExtraMensal'> | undefined): Centavos =>
  Math.max(0, sobraOtimizada + (plano?.aporteExtraMensal ?? 0))

/** Plano a salvar; `undefined` quando o aporte é zero (zerar o aporte remove o plano). */
export function montarPlano(e: { id: string; financiamentoId: string; aporte: Centavos; efeito: EfeitoAporte }): PlanoAmortizacao | undefined {
  return e.aporte > 0 ? { id: e.id, financiamentoId: e.financiamentoId, aporteExtraMensal: e.aporte, efeito: e.efeito } : undefined
}

// ---------- Lista de lançamentos ----------

/** Ids apagados ao excluir um lançamento: uma transferência leva as duas pontas. */
export function idsDeExclusao(l: Lancamento, lancs: Lancamento[]): string[] {
  if (l.transferenciaId === undefined) return [l.id]
  const par = lancs.filter((x) => x.transferenciaId === l.transferenciaId).map((x) => x.id)
  return par.includes(l.id) ? par : [...par, l.id]
}
