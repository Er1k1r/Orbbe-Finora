import { ehMovimentoInterno, ehPagamentoParcela, parcelaDoMes } from './fluxo'
import { mesDe, mesesAnteriores, somarMeses } from './meses'
import type { Categoria, Centavos, Financiamento, Lancamento, Mes } from './tipos'

export interface EntradaEssencial {
  lancamentos: Lancamento[]
  categorias: Categoria[]
  financiamentos: Financiamento[]
}

/** Saídas de verdade: sem movimento interno e sem pagamento de financiamento (a parcela vem do contrato). */
export function saidasComuns(lancs: Lancamento[], financiamentos: Financiamento[]): Lancamento[] {
  const ids = new Set(financiamentos.map((f) => f.id))
  return lancs.filter((l) => l.tipo === 'saida' && !ehMovimentoInterno(l) && !ehPagamentoParcela(l, ids))
}

/** Modelos recorrentes ativos em `mes` (mês do modelo anterior, dentro de `recorrenciaAte`) que ainda não têm cópia nele. */
export function modelosSemCopia(modelos: Lancamento[], todos: Lancamento[], mes: Mes): Lancamento[] {
  return modelos.filter(
    (l) =>
      l.recorrencia === 'mensal' &&
      mesDe(l.data) < mes &&
      (l.recorrenciaAte === undefined || l.recorrenciaAte >= mes) &&
      !todos.some((c) => c.origemId === l.id && mesDe(c.data) === mes),
  )
}

const soma = (ls: Lancamento[]) => ls.reduce((s, l) => s + l.valor, 0)

/**
 * Custo essencial de `mes`: o que já foi lançado (pago e pendente) mais o que ainda vai vir
 * (recorrentes sem cópia, parcelas de financiamento pelo contrato e a falta para a média
 * das categorias variáveis, calculada sobre os 3 meses anteriores a `base`).
 */
export function custoEssencialMes(e: EntradaEssencial, mes: Mes, base: Mes = mes): Centavos {
  const essenciais = new Set(e.categorias.filter((c) => c.essencial).map((c) => c.id))
  const saidas = saidasComuns(e.lancamentos, e.financiamentos).filter((l) => essenciais.has(l.categoriaId))
  const lancadas = saidas.filter((l) => mesDe(l.data) === mes)
  const projetadas = modelosSemCopia(saidas, e.lancamentos, mes)
  const parcelas = e.financiamentos.reduce((s, f) => s + parcelaDoMes(f, mes, e.lancamentos), 0)
  const anteriores = mesesAnteriores(base, 3)
  let falta = 0
  for (const c of e.categorias.filter((x) => x.essencial && x.natureza === 'variavel')) {
    const doCat = saidas.filter((l) => l.categoriaId === c.id)
    const hist = anteriores.map((m) => soma(doCat.filter((l) => mesDe(l.data) === m))).filter((v) => v > 0)
    if (hist.length === 0) continue
    const media = Math.round(hist.reduce((s, v) => s + v, 0) / hist.length)
    const previsto = soma(lancadas.filter((l) => l.categoriaId === c.id)) + soma(projetadas.filter((l) => l.categoriaId === c.id))
    falta += Math.max(0, media - previsto)
  }
  return soma(lancadas) + soma(projetadas) + parcelas + falta
}

/** Custo essencial de referência (alvo da reserva): média do mês e dos dois seguintes, todos com a mesma base. */
export function custoEssencialReferencia(e: EntradaEssencial, mes: Mes): Centavos {
  const total = [0, 1, 2].reduce((s, k) => s + custoEssencialMes(e, somarMeses(`${mes}-01`, k).slice(0, 7), mes), 0)
  return Math.round(total / 3)
}
