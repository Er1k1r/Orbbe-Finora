import { saidasComuns } from './essencial'
import { modelosSemCopia } from './recorrencia'
import { estadoFinanciamento, parcelaDoMes } from './fluxo'
import { mesDe, somarMeses } from './meses'
import type { Centavos, Financiamento, Lancamento, Mes } from './tipos'

export type OrigemCompromisso = 'financiamento' | 'parcelado' | 'recorrencia' | 'outro'

export interface ItemCompromisso { descricao: string; valor: Centavos; origem: OrigemCompromisso }
export interface MesCompromissos {
  mes: Mes
  financiamentos: Centavos
  parcelados: Centavos
  recorrencias: Centavos
  outros: Centavos
  total: Centavos
  itens: ItemCompromisso[]
}
export interface Termino { descricao: string; mes: Mes; valor: Centavos; origem: Exclude<OrigemCompromisso, 'outro'> }

export interface EntradaProjecao {
  lancamentos: Lancamento[]
  financiamentos: Financiamento[]
}

const nomeDe = (l: Lancamento) => l.descricao ?? l.observacao ?? l.categoriaId

/** Compromissos dos próximos `n` meses a partir de `mesInicial`, por tipo, e os términos de cada compromisso. */
export function projetarCompromissos(e: EntradaProjecao, mesInicial: Mes, n = 6) {
  const saidas = saidasComuns(e.lancamentos, e.financiamentos)
  const meses: MesCompromissos[] = []
  for (let k = 0; k < n; k++) {
    const mes = somarMeses(`${mesInicial}-01`, k).slice(0, 7)
    const doMes = saidas.filter((l) => mesDe(l.data) === mes)
    const itens: ItemCompromisso[] = []
    const colocar = (origem: OrigemCompromisso, descricao: string, valor: Centavos) => {
      itens.push({ descricao, valor, origem })
      return valor
    }
    let financiamentos = 0
    for (const f of e.financiamentos) {
      const v = parcelaDoMes(f, mes, e.lancamentos)
      if (v > 0) financiamentos += colocar('financiamento', f.nome, v)
    }
    let parcelados = 0
    let recorrencias = 0
    let outros = 0
    for (const l of doMes) {
      if (l.parcelamento) parcelados += colocar('parcelado', nomeDe(l), l.valor)
      else if (l.origemId !== undefined || l.recorrencia === 'mensal') recorrencias += colocar('recorrencia', nomeDe(l), l.valor)
      else if (l.status === 'pendente') outros += colocar('outro', nomeDe(l), l.valor)
    }
    for (const m of modelosSemCopia(saidas, e.lancamentos, mes)) recorrencias += colocar('recorrencia', nomeDe(m), m.valor)
    meses.push({ mes, financiamentos, parcelados, recorrencias, outros, total: financiamentos + parcelados + recorrencias + outros, itens })
  }

  const terminos: Termino[] = []
  const grupos = new Map<string, Lancamento>()
  for (const l of saidas) {
    if (!l.parcelamento) continue
    const atual = grupos.get(l.parcelamento.grupoId)
    if (!atual || l.parcelamento.numero > (atual.parcelamento?.numero ?? 0)) grupos.set(l.parcelamento.grupoId, l)
  }
  for (const l of grupos.values()) terminos.push({ descricao: nomeDe(l), mes: mesDe(l.data), valor: l.valor, origem: 'parcelado' })
  for (const f of e.financiamentos) {
    const ultima = estadoFinanciamento(f, e.lancamentos).restantes.at(-1)
    if (ultima) terminos.push({ descricao: f.nome, mes: mesDe(ultima.vencimento), valor: ultima.parcela, origem: 'financiamento' })
  }
  for (const l of saidas) {
    if (l.recorrencia === 'mensal' && l.recorrenciaAte !== undefined)
      terminos.push({ descricao: nomeDe(l), mes: l.recorrenciaAte, valor: l.valor, origem: 'recorrencia' })
  }
  return {
    meses,
    terminos: terminos.filter((t) => t.mes >= mesInicial).sort((a, b) => a.mes.localeCompare(b.mes)),
  }
}
