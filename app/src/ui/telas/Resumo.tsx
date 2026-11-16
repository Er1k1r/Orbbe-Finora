import { Fragment, useMemo, type ReactNode } from 'react'
import { Comparativo, DreMes, RoscaRecorrencia, SaldoDegraus, Variacao } from '../componentes/Analises'
import { comparativoCategorias, dreMes, reparticaoSaidas } from '../../domain/analise'
import { ListaSemana } from '../componentes/ListaSemana'
import { Link } from 'react-router-dom'
import { ChecklistInicial } from '../componentes/ChecklistInicial'
import { CartaoReserva } from '../componentes/CartaoReserva'
import { Moldura } from '../componentes/Moldura'
import { FolhaSobra } from '../componentes/FolhaSobra'
import { useResumo } from '../hooks/useResumo'
import { usePrefs } from '../hooks/usePreferencias'
import { ordemCartoes, type Cartao } from './ordemCartoes'
import { nomeCompromisso, rotuloMes } from '../rotulos'
import { topCategorias } from '../../domain/categorias'
import { formatarBRL } from '../../domain/dinheiro'
import { ehMovimentoInterno, ehPagamentoParcela } from '../../domain/fluxo'
import { hojeLocal, mesAnterior, mesDe } from '../../domain/meses'
import { linhasContas } from '../padroes'
import type { Mes } from '../../domain/tipos'

const Linha = ({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) => (
  <div className="flex items-baseline justify-between gap-3 py-2">
    <span className="text-suave">{rotulo}</span>
    <span className={`valor ${cor ?? ''}`}>{valor}</span>
  </div>
)

const Titulo = ({ children }: { children: ReactNode }) => (
  <h3 className="text-[19px] leading-tight font-extrabold">{children}</h3>
)

/** Quantas colunas cada cartão ocupa: a sobra e a visão geral são largas; o resto divide a grade. */
const LARGURA: Partial<Record<Cartao, string>> = {
  sobra: 'md:col-span-2',
  visaoGeral: 'md:col-span-2',
}

export default function Resumo({ mes, abrirLancamento }: { mes: Mes; abrirLancamento: () => void }) {
  const { resumo: r, aporte, insights, alertasConta, compromissos, reserva, lancamentos, categorias, financiamentos, contas } = useResumo(mes)
  const prefs = usePrefs()
  const { resumo: anterior } = useResumo(mesAnterior(mes, 1))
  const comparativo = useMemo(() => comparativoCategorias(lancamentos, financiamentos, mes), [lancamentos, financiamentos, mes])
  const reparticao = useMemo(() => reparticaoSaidas(lancamentos, financiamentos, mes), [lancamentos, financiamentos, mes])
  const dre = useMemo(() => dreMes(lancamentos, financiamentos, mes), [lancamentos, financiamentos, mes])
  const nomeCat = (id: string) => categorias.find((c) => c.id === id)?.nome ?? ''
  const idsFin = new Set(financiamentos.map((f) => f.id))

  const alertas = alertasConta.map((i) => (
    <div key={i.id} role="alert" className="rounded-2xl bg-[var(--casca)] p-4 ring-1 ring-[var(--vermelho)]">
      <div className="font-semibold text-negativo">{i.titulo}</div>
      <div className="text-sm text-suave">{i.detalhe}</div>
    </div>
  ))

  if (lancamentos.length === 0)
    return (
      <div className="grid gap-5">
        {alertas}
        <ChecklistInicial abrirLancamento={abrirLancamento} />
        <Moldura>
          <h2 className="text-xl font-semibold">Registre seu primeiro lançamento</h2>
          <p className="mt-2 text-suave">Registre uma entrada ou saída para ver sua sobra do mês.</p>
          <button onClick={abrirLancamento} className="mt-4 min-h-12 rounded-full bg-marca px-6 font-semibold text-white">
            Registrar lançamento
          </button>
        </Moldura>
      </div>
    )

  // Transferências e ajustes não são entrada nem saída de verdade: ficam fora da lista.
  const ultimos = lancamentos
    .filter((l) => mesDe(l.data) === mes && !ehMovimentoInterno(l))
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 5)
  const nomeLancamento = (l: (typeof ultimos)[number]) => {
    if (l.descricao) return l.descricao
    // Parcela de financiamento nunca aparece sob uma categoria: usa o nome do contrato.
    if (ehPagamentoParcela(l, idsFin)) return financiamentos.find((f) => f.id === l.financiamentoId)?.nome ?? 'Financiamento'
    return nomeCat(l.categoriaId)
  }
  const destino = topCategorias(lancamentos, financiamentos, mes, 3)
  const linhaContas = linhasContas(contas, lancamentos, mes)
  const tresMeses = compromissos.meses.slice(0, 3)

  const cartoes: Record<Cartao, ReactNode> = {
    sobra: (
      <Moldura heroi className="neon-borda">
        <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <FolhaSobra receitas={r.receitas} despesas={r.despesas} parcelas={r.parcelas} aporte={aporte} normal={r.sobraNormal} otimizada={r.sobraOtimizada} />
          <div className="border-t border-[var(--linha)] pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <SaldoDegraus inicial={r.inicial} saldo={r.saldo} previsto={r.previsto} />
          </div>
        </div>
      </Moldura>
    ),
    pendencias: (
      <Moldura>
        <Titulo>Pendências</Titulo>
        <Linha rotulo="Receitas pendentes" valor={`+ ${formatarBRL(r.receitasPendentes)}`} cor="chip-pendente" />
        <Linha rotulo="Despesas pendentes" valor={`− ${formatarBRL(r.despesasPendentes)}`} cor="chip-pendente" />
        <Linha rotulo="Parcelas a pagar" valor={`− ${formatarBRL(r.parcelasPendentes + r.parcelasAtrasadas)}`} cor="text-divida" />
        {r.antecipacoesPendentes > 0 && (
          <Linha rotulo="Antecipações agendadas" valor={`− ${formatarBRL(r.antecipacoesPendentes)}`} cor="chip-pendente" />
        )}
        <div className="mt-1 border-t border-[var(--linha)] pt-2">
          <Linha rotulo="Saldo seguro" valor={formatarBRL(r.saldoSeguro)} />
          <Link to="/lancamentos" className="inline-flex min-h-11 items-center font-semibold text-marca-texto">Verificar</Link>
          <p className="text-xs text-suave">Saldo no fim do mês menos despesas, parcelas e antecipações ainda não pagas.</p>
        </div>
      </Moldura>
    ),
    contas: (
      <Moldura>
        <Link to="/contas" className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2">
          <Titulo>Contas</Titulo>
          {linhaContas.length === 0 && <p className="mt-2 text-suave">Nenhuma conta cadastrada.</p>}
          <ul className="mt-2 divide-y divide-[var(--linha)]">
            {linhaContas.map((c) => (
              <li key={c.id} className="flex min-h-11 items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate">
                  {c.nome}
                  {c.reserva && <span className="ml-2 rounded-full border border-[var(--linha)] px-2 py-0.5 text-xs font-semibold text-suave">Reserva</span>}
                </span>
                <span className="text-right">
                  <span className={`valor ${c.negativa ? 'text-negativo' : ''}`}>{formatarBRL(c.saldo)}</span>
                  {c.negativa && <span className="block text-xs text-negativo">Conta negativa</span>}
                </span>
              </li>
            ))}
          </ul>
        </Link>
      </Moldura>
    ),
    compromissos: (
      <Moldura>
        <Titulo>Comprometido nos próximos meses</Titulo>
        {tresMeses.every((m) => m.total === 0) && compromissos.terminos.length === 0 ? (
          <p className="mt-2 text-suave">Nada programado.</p>
        ) : (
          <>
            <ul className="mt-2 divide-y divide-[var(--linha)]">
              {tresMeses.map((m) => (
                <li key={m.mes} className="flex items-baseline justify-between py-2">
                  <span>{rotuloMes(m.mes)}</span>
                  <span className="valor text-divida">− {formatarBRL(m.total)}</span>
                </li>
              ))}
            </ul>
            {compromissos.terminos.slice(0, 3).map((t) => (
              <p key={`${t.origem}-${t.descricao}-${t.mes}`} className="mt-1 text-sm text-suave">
                {nomeCompromisso(t.descricao, categorias)} termina em {rotuloMes(t.mes)}
              </p>
            ))}
          </>
        )}
        <Link to="/compromissos" className="mt-3 inline-flex min-h-11 items-center font-semibold text-marca-texto">Ver 6 meses</Link>
      </Moldura>
    ),
    visaoGeral: (
      <section aria-label="Visão geral">
        <h3 className="mb-2 px-1 text-[19px] leading-tight font-extrabold">Visão geral</h3>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            { rotulo: 'Saldo nas contas', v: r.saldo, ant: anterior.saldo, bom: true, cor: '' },
            { rotulo: 'Recebido no mês', v: r.receitas, ant: anterior.receitas, bom: true, cor: 'text-positivo' },
            { rotulo: 'Gasto no mês', v: r.despesas, ant: anterior.despesas, bom: false, cor: 'text-negativo' },
            { rotulo: 'Financiamentos', v: r.parcelas, ant: anterior.parcelas, bom: false, cor: 'text-divida' },
          ].map((k) => (
            <Moldura key={k.rotulo} preenchimento="p-4">
              <div className="text-xs text-suave">{k.rotulo}</div>
              <div className={`valor mt-1 text-[22px] ${k.cor}`}>{formatarBRL(k.v)}</div>
              <div className="mt-2"><Variacao atual={k.v} anterior={k.ant} bomSobe={k.bom} /></div>
            </Moldura>
          ))}
        </div>
        {r.antecipacoes > 0 && <p className="mt-2 px-1 text-xs text-suave">Antecipações pagas no mês: {formatarBRL(r.antecipacoes)} (não entram na sobra).</p>}
      </section>
    ),
    comparativo: (
      <Moldura>
        <Titulo>Comparativo com o mês anterior</Titulo>
        <p className="mt-1 text-xs text-suave">A barra é este mês; o traço marca o mês anterior.</p>
        <Comparativo linhas={comparativo.slice(0, 7)} categorias={categorias} />
      </Moldura>
    ),
    recorrencia: (
      <Moldura>
        <Titulo>Saídas por recorrência</Titulo>
        <RoscaRecorrencia r={reparticao} />
      </Moldura>
    ),
    dre: (
      <Moldura>
        <Titulo>Resultado previsto do mês</Titulo>
        <DreMes d={dre} />
      </Moldura>
    ),
    destino: (
      <Moldura>
        <Titulo>Para onde foi o dinheiro</Titulo>
        {destino.length === 0 && <p className="mt-2 text-suave">Sem saídas neste mês.</p>}
        <ul className="mt-2 divide-y divide-[var(--linha)]">
          {destino.map((c) => (
            <li key={c.categoriaId} className="flex items-baseline justify-between gap-3 py-2">
              <span>{nomeCat(c.categoriaId) || c.categoriaId} <span className="valor text-xs text-suave">{c.pct}%</span></span>
              <span className="valor text-negativo">− {formatarBRL(c.total)}</span>
            </li>
          ))}
        </ul>
      </Moldura>
    ),
    reserva: <CartaoReserva reserva={reserva} verMais />,
    insights: (
      <Moldura>
        <Titulo>Insights</Titulo>
        {insights.length === 0 && <p className="mt-2 text-suave">Sem alertas este mês.</p>}
        <ul className="mt-2 grid gap-3">
          {insights.slice(0, 3).map((i) => (
            <li key={i.id}>
              <div className={`font-semibold ${i.severidade === 'alerta' ? 'text-negativo' : ''}`}>{i.titulo}</div>
              <div className="text-sm text-suave">{i.detalhe}</div>
            </li>
          ))}
        </ul>
        <Link to="/insights" className="mt-3 inline-flex min-h-11 items-center font-semibold text-marca-texto">Ver todos</Link>
      </Moldura>
    ),
    ultimos: (
      <Moldura>
        <Titulo>Últimos lançamentos</Titulo>
        {ultimos.length === 0 && <p className="mt-2 text-suave">Nenhum lançamento neste mês.</p>}
        <ul className="mt-2 divide-y divide-[var(--linha)]">
          {ultimos.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <div>
                  {nomeLancamento(l)}
                  {l.parcelamento && <span className="ml-2 valor text-xs text-suave">{l.parcelamento.numero}/{l.parcelamento.total}</span>}
                </div>
                <div className="text-xs text-suave">{l.data.slice(8)}/{l.data.slice(5, 7)}{l.status === 'pendente' ? ' · pendente' : ''}</div>
              </div>
              <span className={`valor ${l.tipo === 'entrada' ? 'text-positivo' : 'text-negativo'}`}>
                {l.tipo === 'entrada' ? '+' : '−'} {formatarBRL(l.valor)}
              </span>
            </li>
          ))}
        </ul>
      </Moldura>
    ),
  }

  return (
    <div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
      {alertas.length > 0 && <div className="grid gap-5 md:col-span-2 xl:col-span-3">{alertas}</div>}
      {ordemCartoes(prefs.objetivos).map((c) => (
        <Fragment key={c}>
          <div className={LARGURA[c] ?? ''}>{cartoes[c]}</div>
          {c === 'sobra' && mes === mesDe(hojeLocal()) && <div className="md:col-span-2 xl:col-span-1 xl:row-span-2"><ListaSemana hoje={hojeLocal()} /></div>}
          {c === 'sobra' && <div className="md:col-span-2 empty:hidden xl:col-span-3"><ChecklistInicial abrirLancamento={abrirLancamento} /></div>}
        </Fragment>
      ))}
    </div>
  )
}
