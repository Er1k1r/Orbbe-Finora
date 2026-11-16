import { simularAporte } from './amortizacao'
import { saldoReserva, situacaoContas } from './contas'
import { aporteVigente, ehMovimentoInterno, ehPagamentoParcela, estadoFinanciamento, parcelaDoMes, resumoMes } from './fluxo'
import { formatarBRL, formatarNumero, formatarPct } from './dinheiro'
import { fimDoMes, mesDe, mesesAnteriores } from './meses'
import { custoEssencialReferencia } from './essencial'
import { rendaEsperada, reservaAlvoMeses } from './renda'
import type {
  Categoria, Conta, Financiamento, FonteDeRenda, Lancamento, Mes, PlanoAmortizacao,
} from './tipos'

export const CONFIG_INSIGHTS = {
  crescimentoMinimo: 0.2,
  pisoCrescimento: 5000,
  picoFator: 3,
  picoMinimoAmostras: 4,
  fixoPctRenda: 0.05,
  comprometimentoMax: 0.3,
}

export interface Insight {
  id: string
  tipo:
    | 'gasto_crescendo' | 'pico_atipico' | 'despesa_fixa_alta' | 'reserva_baixa'
    | 'sobra_para_divida' | 'divida_mais_cara' | 'mes_de_risco' | 'comprometimento_renda'
    | 'conta_negativa' | 'conta_ficara_negativa'
  severidade: 'info' | 'alerta'
  titulo: string
  detalhe: string
  dados: Record<string, number | string>
}

export interface ContextoInsights {
  mes: Mes
  lancamentos: Lancamento[]
  categorias: Categoria[]
  fontes: FonteDeRenda[]
  financiamentos: Financiamento[]
  planos: PlanoAmortizacao[]
  contas: Conta[]
  config?: Partial<typeof CONFIG_INSIGHTS>
}

const DICA_RESERVA = ' Dica: marque a conta que é sua reserva para este cálculo ficar exato.'
const soma = (ls: Lancamento[]) => ls.reduce((s, l) => s + l.valor, 0)
const mediana = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export function gerarInsights(ctx: ContextoInsights): Insight[] {
  const cfg = { ...CONFIG_INSIGHTS, ...ctx.config }
  const out: Insight[] = []
  const nomeCat = (id: string) => ctx.categorias.find((c) => c.id === id)?.nome ?? id
  const idsFin = new Set(ctx.financiamentos.map((f) => f.id))
  // Pagamentos de parcela já entram em `parcelas`; as regras de despesa (1, 2, 3, 7) os ignoram.
  const saidas = ctx.lancamentos.filter((l) => l.tipo === 'saida' && !ehMovimentoInterno(l) && !ehPagamentoParcela(l, idsFin))
  const doMes = saidas.filter((l) => mesDe(l.data) === ctx.mes)
  const anteriores = mesesAnteriores(ctx.mes, 3)
  const renda = rendaEsperada(ctx.fontes, ctx.lancamentos, ctx.mes)
  const parcelas = ctx.financiamentos.reduce((s, f) => s + parcelaDoMes(f, ctx.mes, ctx.lancamentos), 0)

  // 1. gasto crescendo
  for (const catId of new Set(doMes.map((l) => l.categoriaId))) {
    const atual = soma(doMes.filter((l) => l.categoriaId === catId))
    const hist = anteriores
      .map((m) => soma(saidas.filter((l) => l.categoriaId === catId && mesDe(l.data) === m)))
      .filter((v) => v > 0)
    if (hist.length === 0) continue
    const media = hist.reduce((s, v) => s + v, 0) / hist.length
    if (atual > media * (1 + cfg.crescimentoMinimo) && atual - media >= cfg.pisoCrescimento) {
      const pct = Math.round(((atual - media) / media) * 100)
      out.push({
        id: `crescendo-${catId}`, tipo: 'gasto_crescendo', severidade: 'alerta',
        titulo: `${nomeCat(catId)} subiu ${pct}%`,
        detalhe: `Este mês: ${formatarBRL(atual)}. Média dos meses anteriores: ${formatarBRL(Math.round(media))}.`,
        dados: { categoria: catId, atual, media: Math.round(media) },
      })
    }
  }

  // 2. pico atípico
  for (const l of doMes) {
    const amostra = saidas.filter((x) => x.categoriaId === l.categoriaId && x.id !== l.id).map((x) => x.valor)
    if (amostra.length < cfg.picoMinimoAmostras) continue
    const med = mediana(amostra)
    if (l.valor > med * cfg.picoFator) {
      out.push({
        id: `pico-${l.id}`, tipo: 'pico_atipico', severidade: 'info',
        titulo: `Gasto fora do padrão em ${nomeCat(l.categoriaId)}`,
        detalhe: `${formatarBRL(l.valor)} em ${l.data}; o comum nessa categoria é ${formatarBRL(Math.round(med))}.`,
        dados: { lancamento: l.id, valor: l.valor, mediana: Math.round(med) },
      })
    }
  }

  // 3. despesa fixa alta
  if (renda > 0) {
    const fixas = doMes.filter((l) => l.natureza === 'fixo')
    for (const catId of new Set(fixas.map((l) => l.categoriaId))) {
      const total = soma(fixas.filter((l) => l.categoriaId === catId))
      if (total > renda * cfg.fixoPctRenda) {
        out.push({
          id: `fixa-${catId}`, tipo: 'despesa_fixa_alta', severidade: 'info',
          titulo: `${nomeCat(catId)} pesa ${Math.round((total / renda) * 100)}% da renda`,
          detalhe: `${formatarBRL(total)} por mês. Vale renegociar ou comparar preços.`,
          dados: { categoria: catId, total, renda },
        })
      }
    }
  }

  // 4. reserva baixa
  const { saldo, usandoTodas } = saldoReserva(ctx.contas, ctx.lancamentos, fimDoMes(ctx.mes))
  const essencial = custoEssencialReferencia(
    { lancamentos: ctx.lancamentos, categorias: ctx.categorias, financiamentos: ctx.financiamentos }, ctx.mes,
  )
  const meses = reservaAlvoMeses(ctx.fontes)
  const meta = essencial * meses
  const reservaOk = essencial > 0 && saldo >= meta
  if (essencial > 0 && saldo < meta) {
    const cobertos = Math.max(0, saldo / essencial)
    out.push({
      id: 'reserva-baixa', tipo: 'reserva_baixa', severidade: 'alerta',
      titulo: 'Reserva abaixo da meta',
      detalhe: `Você cobre ${formatarNumero(cobertos)} de ${meses} meses de custo essencial. Faltam ${formatarBRL(meta - saldo)}.${usandoTodas ? DICA_RESERVA : ''}`,
      dados: { saldo, meta, meses },
    })
  }

  // 4b. contas negativas (cheque especial) e contas que vão ficar negativas até o fim do mês
  for (const sc of situacaoContas(ctx.contas, ctx.lancamentos, ctx.mes, ctx.financiamentos)) {
    const nome = ctx.contas.find((c) => c.id === sc.contaId)?.nome ?? sc.contaId
    if (sc.negativa) {
      const juros = sc.jurosEstimadoMes > 0 ? ` Juros estimados do cheque especial: ${formatarBRL(sc.jurosEstimadoMes)} no mês.` : ''
      out.push({
        id: `conta-negativa-${sc.contaId}`, tipo: 'conta_negativa', severidade: 'alerta',
        titulo: `${nome} está negativa em ${formatarBRL(sc.usoLimite)}`,
        detalhe: `Saldo de ${formatarBRL(sc.saldo)}.${juros} Se no banco ela não está negativa, falta lançar alguma entrada nesta conta.`,
        dados: { conta: sc.contaId, saldo: sc.saldo, juros: sc.jurosEstimadoMes },
      })
    } else if (sc.ficaraNegativa) {
      out.push({
        id: `conta-ficara-negativa-${sc.contaId}`, tipo: 'conta_ficara_negativa', severidade: 'alerta',
        titulo: `${nome} vai ficar negativa até o fim do mês`,
        detalhe: `Previsto no fim do mês: ${formatarBRL(sc.previsto)} com os pendentes lançados.`,
        dados: { conta: sc.contaId, saldo: sc.saldo, previsto: sc.previsto },
      })
    }
  }

  // 5. sobra para a dívida / 6. dívida mais cara
  const estados = new Map(ctx.financiamentos.map((f) => [f.id, estadoFinanciamento(f, ctx.lancamentos, fimDoMes(ctx.mes))]))
  const candidatas = ctx.financiamentos.filter((f) => (estados.get(f.id)?.saldoDevedor ?? 0) > 0)
  const maisCara = [...candidatas].sort((a, b) => b.taxaMensal - a.taxaMensal)[0]
  const aporteExistente = aporteVigente(ctx.planos, ctx.financiamentos, ctx.lancamentos, ctx.mes)
  const resumo = resumoMes({
    mes: ctx.mes, contas: ctx.contas, lancamentos: ctx.lancamentos,
    financiamentos: ctx.financiamentos, aporteExtra: aporteExistente,
  })
  if (maisCara && resumo.sobraOtimizada > 0) {
    const sugerido = reservaOk ? resumo.sobraOtimizada : Math.round(resumo.sobraOtimizada / 2)
    const estado = estados.get(maisCara.id)!
    const aporte = Math.min(sugerido, estado.saldoDevedor) // nunca além do saldo da dívida
    const planosDela = ctx.planos.filter((p) => p.financiamentoId === maisCara.id)
    const existente = planosDela.reduce((s, p) => s + p.aporteExtraMensal, 0)
    const efeito = planosDela[0]?.efeito ?? 'reduzir_prazo'
    const sim = (x: number) => simularAporte({
      saldo: estado.saldoDevedor, taxa: maisCara.taxaMensal, prazo: estado.restantes.length,
      sistema: maisCara.sistema, aporte: x, efeito,
      parcelaFixa: maisCara.sistema === 'PRICE' ? maisCara.valorParcela : undefined,
      amortizacaoFixa: maisCara.sistema === 'SAC' ? Math.round(maisCara.valorFinanciado / maisCara.totalParcelas) : undefined,
    })
    const antes = sim(existente)
    const depois = sim(existente + aporte)
    const economiaJuros = depois.economiaJuros - antes.economiaJuros
    const mesesEconomizados = depois.mesesEconomizados - antes.mesesEconomizados
    if (economiaJuros > 0) {
      out.push({
        id: 'sobra-divida', tipo: 'sobra_para_divida', severidade: 'info',
        titulo: reservaOk ? 'Use a sobra para quitar mais rápido' : 'Divida a sobra entre reserva e dívida',
        detalhe: `Um aporte de ${formatarBRL(aporte)}/mês em ${maisCara.nome} economiza ${formatarBRL(economiaJuros)} em juros e ${mesesEconomizados} meses.`,
        dados: { financiamento: maisCara.id, aporte, economia: economiaJuros },
      })
    }
  }
  if (candidatas.length > 1 && maisCara) {
    out.push({
      id: 'divida-cara', tipo: 'divida_mais_cara', severidade: 'info',
      titulo: `Priorize ${maisCara.nome}`,
      detalhe: `Maior taxa entre as dívidas: ${formatarPct(maisCara.taxaMensal)} ao mês.`,
      dados: { financiamento: maisCara.id, taxa: maisCara.taxaMensal },
    })
  }

  // 7. mês de risco (renda variável/eventual)
  const temVariavel = ctx.fontes.some((f) => f.tipo === 'variavel')
  const recebido = soma(
    ctx.lancamentos.filter((l) => l.tipo === 'entrada' && !ehMovimentoInterno(l) && l.status === 'pago' && mesDe(l.data) === ctx.mes),
  )
  const fixosMes = soma(doMes.filter((l) => l.natureza === 'fixo')) + parcelas
  // A referência não pode cair a 0 só porque o histórico irregular zerou a estimativa.
  const referencia = Math.max(
    renda,
    ctx.fontes.filter((f) => f.tipo === 'variavel').reduce((s, f) => s + f.valorEsperado, 0),
  )
  if (temVariavel && recebido < referencia && fixosMes > recebido) {
    out.push({
      id: 'mes-risco', tipo: 'mes_de_risco', severidade: 'alerta',
      titulo: 'Mês de risco: fixos ainda não cobertos',
      detalhe: `Recebido ${formatarBRL(recebido)} de ${formatarBRL(referencia)} esperados; custos fixos somam ${formatarBRL(fixosMes)}.`,
      dados: { recebido, renda: referencia, fixos: fixosMes },
    })
  }

  // 8. comprometimento de renda
  if (renda === 0 && parcelas > 0) {
    out.push({
      id: 'comprometimento', tipo: 'comprometimento_renda', severidade: 'alerta',
      titulo: 'Parcelas sem renda esperada cadastrada',
      detalhe: `${formatarBRL(parcelas)} de parcelas no mês e nenhuma renda esperada cadastrada.`,
      dados: { parcelas, renda },
    })
  } else if (renda > 0 && parcelas / renda > cfg.comprometimentoMax) {
    out.push({
      id: 'comprometimento', tipo: 'comprometimento_renda', severidade: 'alerta',
      titulo: `Parcelas consomem ${Math.round((parcelas / renda) * 100)}% da renda`,
      detalhe: `${formatarBRL(parcelas)} de ${formatarBRL(renda)} esperados. O limite saudável é ${Math.round(cfg.comprometimentoMax * 100)}%.`,
      dados: { parcelas, renda },
    })
  }

  return out.sort((a, b) => Number(b.severidade === 'alerta') - Number(a.severidade === 'alerta'))
}
