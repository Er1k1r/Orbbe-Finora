import { situacaoContas } from './contas'
import { ehMovimentoInterno, ehPagamentoParcela, resumoMes, saldoContas } from './fluxo'
import { fimDoMes, mesAnterior, mesDe } from './meses'
import { previstosDoMes } from './recorrencia'
import type { Centavos, Conta, Financiamento, Lancamento, Mes } from './tipos'

/** Saídas comuns do mês (lançadas e previstas da recorrência), como o resumo as conta: sem internos nem parcela de contrato. */
function saidasDoMes(lancs: Lancamento[], financiamentos: Financiamento[], mes: Mes): Lancamento[] {
  const ids = new Set(financiamentos.map((f) => f.id))
  const reais = lancs.filter((l) => mesDe(l.data) === mes && l.tipo === 'saida' && !ehMovimentoInterno(l) && !ehPagamentoParcela(l, ids))
  return [...reais, ...previstosDoMes(lancs, mes, 'saida').filter((l) => !ehPagamentoParcela(l, ids))]
}
const soma = (ls: Lancamento[]) => ls.reduce((s, l) => s + l.valor, 0)

export interface LinhaComparativo { categoriaId: string; atual: Centavos; anterior: Centavos; variacao: number | null }

/**
 * Gasto por categoria no mês contra o mês anterior. `variacao` é a fração de mudança (0,26 = +26%);
 * `null` quando o mês anterior não teve gasto na categoria. Ordem: maior gasto atual primeiro.
 */
export function comparativoCategorias(lancs: Lancamento[], financiamentos: Financiamento[], mes: Mes): LinhaComparativo[] {
  const porCat = (ls: Lancamento[]) => {
    const m = new Map<string, Centavos>()
    for (const l of ls) m.set(l.categoriaId, (m.get(l.categoriaId) ?? 0) + l.valor)
    return m
  }
  const atual = porCat(saidasDoMes(lancs, financiamentos, mes))
  const anterior = porCat(saidasDoMes(lancs, financiamentos, mesAnterior(mes, 1)))
  return [...new Set([...atual.keys(), ...anterior.keys()])]
    .map((categoriaId) => {
      const a = atual.get(categoriaId) ?? 0
      const p = anterior.get(categoriaId) ?? 0
      return { categoriaId, atual: a, anterior: p, variacao: p === 0 ? null : (a - p) / p }
    })
    .sort((x, y) => y.atual - x.atual || y.anterior - x.anterior)
}

export interface Reparticao { fixas: Centavos; parceladas: Centavos; variaveis: Centavos; financiamentos: Centavos }

/**
 * Saídas do mês por recorrência: fixas (natureza fixo, sem parcelamento), compras parceladas, financiamentos (parcela
 * do contrato) e variáveis (o resto, inclusive o que se pagou acima da parcela). Soma = despesas + parcelas do resumo.
 */
export function reparticaoSaidas(lancs: Lancamento[], financiamentos: Financiamento[], mes: Mes): Reparticao {
  const r = resumoMes({ mes, contas: [], lancamentos: lancs, financiamentos, aporteExtra: 0 })
  const saidas = saidasDoMes(lancs, financiamentos, mes)
  const parceladas = soma(saidas.filter((l) => l.parcelamento))
  const fixas = soma(saidas.filter((l) => !l.parcelamento && l.natureza === 'fixo'))
  return { fixas, parceladas, variaveis: r.despesas - fixas - parceladas, financiamentos: r.parcelas }
}

export interface Dre {
  receitas: Centavos; variaveis: Centavos; margem: Centavos; fixas: Centavos; financiamentos: Centavos
  resultado: Centavos; pct: number | null
}

/** Resultado previsto do mês em degraus (receitas − variáveis − fixas − financiamentos). O resultado é a sobra normal. */
export function dreMes(lancs: Lancamento[], financiamentos: Financiamento[], mes: Mes): Dre {
  const r = resumoMes({ mes, contas: [], lancamentos: lancs, financiamentos, aporteExtra: 0 })
  const rep = reparticaoSaidas(lancs, financiamentos, mes)
  const variaveis = rep.variaveis
  const fixas = rep.fixas + rep.parceladas
  const margem = r.receitas - variaveis
  return {
    receitas: r.receitas, variaveis, margem, fixas, financiamentos: r.parcelas,
    resultado: r.sobraNormal, pct: r.receitas > 0 ? r.sobraNormal / r.receitas : null,
  }
}

export interface MovimentoConta {
  contaId: string; inicial: Centavos; receitas: Centavos; despesas: Centavos
  transfEntrada: Centavos; transfSaida: Centavos; saldo: Centavos; previsto: Centavos
}

/**
 * Movimento de cada conta no mês (só o que já foi pago): saldo do fim do mês anterior, receitas e despesas (ajustes
 * de conferência entram aqui pelo sinal), transferências recebidas e enviadas. Sempre fecha:
 * inicial + receitas − despesas + transfEntrada − transfSaida = saldo.
 */
export function movimentoContas(contas: Conta[], lancs: Lancamento[], mes: Mes, financiamentos: Financiamento[] = []): MovimentoConta[] {
  const situacao = new Map(situacaoContas(contas, lancs, mes, financiamentos).map((s) => [s.contaId, s]))
  const fimAnterior = fimDoMes(mesAnterior(mes, 1))
  return contas.map((c) => {
    const daConta = lancs.filter((l) => l.contaId === c.id)
    const doMes = daConta.filter((l) => l.status === 'pago' && mesDe(l.data) === mes)
    const transf = doMes.filter((l) => l.especie === 'transferencia')
    const comuns = doMes.filter((l) => l.especie !== 'transferencia')
    return {
      contaId: c.id,
      inicial: saldoContas([c], daConta, fimAnterior),
      receitas: soma(comuns.filter((l) => l.tipo === 'entrada')),
      despesas: soma(comuns.filter((l) => l.tipo === 'saida')),
      transfEntrada: soma(transf.filter((l) => l.tipo === 'entrada')),
      transfSaida: soma(transf.filter((l) => l.tipo === 'saida')),
      saldo: situacao.get(c.id)?.saldo ?? 0,
      previsto: situacao.get(c.id)?.previsto ?? 0,
    }
  })
}
