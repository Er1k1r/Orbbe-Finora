import { useMemo } from 'react'
import { saldoReserva } from '../../domain/contas'
import { custoEssencialReferencia } from '../../domain/essencial'
import { resumoMes } from '../../domain/fluxo'
import { gerarInsights, type Insight } from '../../domain/insights'
import { fimDoMes } from '../../domain/meses'
import { projetarCompromissos } from '../../domain/projecao'
import { reservaAlvoMeses } from '../../domain/renda'
import { statusReserva } from '../../domain/reserva'
import type { Mes } from '../../domain/tipos'
import { useDados } from './useDados'

const ehConta = (i: Insight) => i.tipo === 'conta_negativa' || i.tipo === 'conta_ficara_negativa'
const alertaPrimeiro = (a: Insight, b: Insight) => Number(b.severidade === 'alerta') - Number(a.severidade === 'alerta')

export function useResumo(mes: Mes) {
  const d = useDados() // vem do DadosContext (provido no Shell)
  return useMemo(() => {
    const aporte = d.planos.reduce((s, p) => s + p.aporteExtraMensal, 0)
    const resumo = resumoMes({
      mes, contas: d.contas, lancamentos: d.lancamentos, financiamentos: d.financiamentos, aporteExtra: aporte,
    })
    // `mes` por último: o contexto também tem `mes`, e o parâmetro é quem manda.
    const todos = gerarInsights({ ...d, mes })
    const alertasConta = todos.filter(ehConta) // vão para o topo do Resumo
    const insights = todos.filter((i) => !ehConta(i)).sort(alertaPrimeiro) // cartão "Insights" do Resumo
    const todosInsights = [...alertasConta, ...insights] // tela Insights: contas negativas, alertas, informativos

    // 6 meses a partir do mês visto; o Resumo mostra os 3 primeiros, a tela /compromissos todos.
    const compromissos = projetarCompromissos({ lancamentos: d.lancamentos, financiamentos: d.financiamentos }, mes, 6)

    // Reserva do MÊS VISTO (mesmo critério do insight `reserva_baixa`), nunca `hojeLocal()`.
    const { saldo, usandoTodas } = saldoReserva(d.contas, d.lancamentos, fimDoMes(mes))
    const custo = custoEssencialReferencia(
      { lancamentos: d.lancamentos, categorias: d.categorias, financiamentos: d.financiamentos },
      mes,
    )
    const alvo = reservaAlvoMeses(d.fontes)
    const reserva = { saldo, usandoTodas, custo, alvo, ...statusReserva(saldo, custo, alvo) }

    return { ...d, aporte, resumo, insights, alertasConta, todosInsights, compromissos, reserva }
  }, [mes, d.contas, d.lancamentos, d.financiamentos, d.planos, d.fontes, d.categorias]) // eslint-disable-line react-hooks/exhaustive-deps
}
