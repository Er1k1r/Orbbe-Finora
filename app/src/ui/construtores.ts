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
import { diffMeses, mesDe, somarMeses } from '../domain/meses'
import { cancelarRecorrencia } from '../domain/recorrencia'
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

// ---------- Exclusão de lançamento recorrente ----------

export interface EdicaoExclusao { apagar: string[]; salvar: Lancamento[] }

/** O modelo mensal do grupo: o próprio lançamento (modelo) ou aquele de que a cópia nasceu (`origemId`). */
export function modeloDaRecorrencia(l: Lancamento, lancs: Lancamento[]): Lancamento | undefined {
  if (l.recorrencia === 'mensal') return l
  if (l.origemId === undefined) return undefined
  return lancs.find((m) => m.id === l.origemId && m.recorrencia === 'mensal')
}

/**
 * "Só este mês". Cópia: apaga só ela (se o modelo não tiver marca d'água cobrindo o mês, avança `geradoAte` até
 * ele para a cópia apagada não ressuscitar). Modelo: o modelo não pode ser apagado (pararia a recorrência), então
 * a recorrência passa para um NOVO modelo (id `${raiz}:modelo:${mês}`, pendente, mesmos campos e `geradoAte`)
 * no mês seguinte ao MAIOR entre o mês do modelo, o das cópias existentes e `geradoAte` — nada é duplicado nem
 * ressuscitado. As cópias passam a apontar para o novo modelo na mesma edição (sem `origemId` pendurado); se a
 * recorrência já acabou antes desse mês (`recorrenciaAte`), não há novo modelo e as cópias viram lançamentos comuns.
 */
export function excluirSoEsteMes(lancs: Lancamento[], alvo: Lancamento): EdicaoExclusao {
  if (alvo.recorrencia !== 'mensal') {
    const mes = mesDe(alvo.data)
    const modelo = alvo.origemId === undefined ? undefined : modeloDaRecorrencia(alvo, lancs)
    const avanca = modelo !== undefined && (modelo.geradoAte === undefined || modelo.geradoAte < mes)
    return { apagar: [alvo.id], salvar: avanca ? [{ ...modelo, geradoAte: mes }] : [] }
  }
  const copias = lancs.filter((c) => c.origemId === alvo.id)
  const ultimo = [mesDe(alvo.data), ...(alvo.geradoAte ? [alvo.geradoAte] : []), ...copias.map((c) => mesDe(c.data))].sort().pop()!
  const mesNovo = somarMeses(`${ultimo}-01`, 1).slice(0, 7)
  if (alvo.recorrenciaAte !== undefined && mesNovo > alvo.recorrenciaAte) {
    return { apagar: [alvo.id], salvar: copias.map(({ origemId: _o, ...comum }) => comum) }
  }
  const raiz = alvo.id.replace(/:modelo:\d{4}-\d{2}$/, '')
  const id = `${raiz}:modelo:${mesNovo}`
  const novo: Lancamento = { ...alvo, id, data: somarMeses(alvo.data, diffMeses(mesDe(alvo.data), mesNovo)), status: 'pendente' }
  return { apagar: [alvo.id], salvar: [novo, ...copias.map((c) => ({ ...c, origemId: id }))] }
}

/**
 * "Encerrar a repetição": o modelo do grupo para de gerar após `mesAtual` (`cancelarRecorrencia`, que preserva
 * `geradoAte`); se o item selecionado é uma cópia pendente de mês futuro, ela também é apagada. Nos demais casos
 * (o modelo, cópia paga ou do mês corrente/passado) o item fica.
 */
export function encerrarRepeticao(lancs: Lancamento[], alvo: Lancamento, mesAtual: string): EdicaoExclusao {
  const modelo = modeloDaRecorrencia(alvo, lancs)
  const futuraPendente = alvo.recorrencia !== 'mensal' && alvo.origemId !== undefined && alvo.status === 'pendente' && mesDe(alvo.data) > mesAtual
  return { apagar: futuraPendente ? [alvo.id] : [], salvar: modelo ? [cancelarRecorrencia(modelo, mesAtual)] : [] }
}
