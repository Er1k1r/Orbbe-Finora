import { useMemo, useState, type ReactNode } from 'react'
import { MotionConfig, motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { PencilSimple } from '@phosphor-icons/react'
import { BemEmMovimento } from '../componentes/BemEmMovimento'
import { EditorLancamento } from '../componentes/EditorLancamento'
import { Moldura } from '../componentes/Moldura'
import { useDados } from '../hooks/useDados'
import { useResumo } from '../hooks/useResumo'
import { repo } from '../../data/repo'
import { formatarBRL } from '../../domain/dinheiro'
import { estadoFinanciamento, ehMovimentoInterno, ehPagamentoParcela } from '../../domain/fluxo'
import { hojeLocal, mesDe, somarMeses } from '../../domain/meses'
import { serieMensal, trilhaFinanciamento, type SituacaoParcela } from '../../domain/painel'
import type { Lancamento, Mes } from '../../domain/tipos'
import { rotuloMes } from '../rotulos'
import { ordenarLancamentos, rotuloParcelamento } from '../lancamento'

const COR_PONTO: Record<SituacaoParcela, string> = {
  paga: 'bg-[var(--verde)] border-[var(--verde)]',
  atrasada: 'bg-[var(--vermelho)] border-[var(--vermelho)]',
  a_pagar: 'bg-transparent border-[var(--vermelho)]',
}
const ROTULO_SITUACAO: Record<SituacaoParcela, string> = { paga: 'paga', atrasada: 'atrasada', a_pagar: 'a pagar' }

function Aparecer({ children, atraso = 0, className = '' }: { children: ReactNode; atraso?: number; className?: string }) {
  return (
    <motion.div className={`min-w-0 ${className}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: atraso, ease: [0.32, 0.72, 0, 1] }}>
      {children}
    </motion.div>
  )
}

const Titulo = ({ children }: { children: ReactNode }) => (
  <h3 className="text-[10px] uppercase tracking-[0.2em] text-suave">{children}</h3>
)

function Legenda({ grafico = false }: { grafico?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-suave">
      {grafico ? (
        <>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block size-3 rounded-[4px] bg-[var(--verde)]" /> pago</span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block size-3 rounded-[4px] bg-[var(--vermelho)]" /> em aberto</span>
        </>
      ) : (['paga', 'a_pagar', 'atrasada'] as const).map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <i className={`inline-block size-3 rounded-[4px] border-2 ${COR_PONTO[s]}`} /> {ROTULO_SITUACAO[s]}
        </span>
      ))}
    </div>
  )
}

function Ponto({ situacao, titulo, i }: { situacao: SituacaoParcela; titulo: string; i: number }) {
  return (
    <i title={titulo} aria-label={titulo} role="img" style={{ animationDelay: `${Math.min(i, 60) * 12}ms` }}
      className={`ponto-aparece inline-block size-3.5 rounded-[5px] border-2 ${COR_PONTO[situacao]}`} />
  )
}

function Kpi({ rotulo, valor, tom = '' }: { rotulo: string; valor: string; tom?: string }) {
  return (
    <div className="rounded-[14px] bg-[var(--superficie)] p-3 ring-1 ring-[var(--linha)]">
      <div className="text-[10px] uppercase tracking-[0.14em] text-suave">{rotulo}</div>
      <div className={`valor mt-1 text-xl font-bold ${tom}`}>{valor}</div>
    </div>
  )
}

function GraficoMeses({ pontos, atual }: { pontos: ReturnType<typeof serieMensal>; atual: Mes }) {
  const maximo = Math.max(...pontos.map((p) => p.pago + p.aberto), 1)
  return (
    <div>
      <div className="flex h-44 items-end gap-1.5 sm:gap-2" role="img" aria-label="Saídas por mês: pago em verde, em aberto em vermelho">
        {pontos.map((p, i) => (
          <div key={p.mes} className="flex h-full flex-1 flex-col justify-end"
            title={`${rotuloMes(p.mes)} · pago ${formatarBRL(p.pago)} · em aberto ${formatarBRL(p.aberto)}`}>
            <motion.div className="flex flex-col justify-end overflow-hidden rounded-t-md"
              initial={{ height: 0 }} animate={{ height: `${((p.pago + p.aberto) / maximo) * 100}%` }}
              transition={{ duration: 0.6, delay: i * 0.04, ease: [0.32, 0.72, 0, 1] }}>
              <div className="bg-[var(--vermelho)]" style={{ flexGrow: p.aberto }} />
              <div className="bg-[var(--verde)]" style={{ flexGrow: p.pago }} />
            </motion.div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5 sm:gap-2">
        {pontos.map((p) => (
          <span key={p.mes} className={`flex-1 text-center text-[10px] ${p.mes === atual ? 'font-bold text-[var(--texto)]' : 'text-suave'}`}>
            {rotuloMes(p.mes).slice(0, 3)}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function Painel({ mes }: { mes: Mes }) {
  const d = useDados()
  const { resumo: r } = useResumo(mes)
  const hoje = hojeLocal()
  const [editando, setEditando] = useState<Lancamento | null>(null)
  const nomeCat = (id: string) => d.categorias.find((c) => c.id === id)?.nome ?? ''
  const idsFin = useMemo(() => new Set(d.financiamentos.map((f) => f.id)), [d.financiamentos])

  const serie = useMemo(
    () => serieMensal(d.lancamentos, d.financiamentos, mesDe(somarMeses(`${mes}-01`, -2)), 12, hoje),
    [d.lancamentos, d.financiamentos, mes, hoje],
  )
  const noMes = serie.find((p) => p.mes === mes)

  const doMes = ordenarLancamentos(d.lancamentos.filter((l) => mesDe(l.data) === mes && !ehMovimentoInterno(l)))
  const nomeLancamento = (l: Lancamento) =>
    l.descricao ?? (ehPagamentoParcela(l, idsFin) ? d.financiamentos.find((f) => f.id === l.financiamentoId)?.nome ?? 'Financiamento' : nomeCat(l.categoriaId))

  const grupos = useMemo(() => {
    const m = new Map<string, Lancamento[]>()
    for (const l of d.lancamentos) if (l.parcelamento) m.set(l.parcelamento.grupoId, [...(m.get(l.parcelamento.grupoId) ?? []), l])
    return [...m.values()]
      .map((g) => g.sort((a, b) => a.parcelamento!.numero - b.parcelamento!.numero))
      .filter((g) => g.some((l) => l.status === 'pendente')) // parcelado já quitado sai do painel
  }, [d.lancamentos])

  return (
    <MotionConfig reducedMotion="user">
      <div className="grid gap-5">
        <Aparecer>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Kpi rotulo="Receitas do mês" valor={formatarBRL(r.receitas)} tom="text-positivo" />
            <Kpi rotulo="Despesas do mês" valor={formatarBRL(r.despesas)} tom="text-negativo" />
            <Kpi rotulo="Financiamentos" valor={formatarBRL(r.parcelas)} tom="text-divida" />
            <Kpi rotulo="Pago no mês" valor={formatarBRL(noMes?.pago ?? 0)} tom="text-positivo" />
            <Kpi rotulo="Em aberto no mês" valor={formatarBRL(noMes?.aberto ?? 0)} tom={noMes && noMes.aberto > 0 ? 'text-negativo' : ''} />
          </div>
        </Aparecer>

        <div className="grid items-start gap-5 xl:grid-cols-3">
          <Aparecer atraso={0.05} className="xl:col-span-2">
            <Moldura>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <Titulo>Saídas mês a mês</Titulo>
                <Legenda grafico />
              </div>
              <GraficoMeses pontos={serie} atual={mes} />
              <p className="mt-3 text-xs text-suave">Inclui parcelas de financiamento, compras parceladas, repetições previstas e o que está pendente.</p>
            </Moldura>
          </Aparecer>

          <Aparecer atraso={0.1}>
            <Moldura>
              <Titulo>Compras parceladas</Titulo>
              {grupos.length === 0 && <p className="mt-2 text-sm text-suave">Nenhuma compra parcelada em andamento.</p>}
              <ul className="mt-2 grid gap-4">
                {grupos.map((g) => {
                  const pagas = g.filter((l) => l.status === 'pago').length
                  return (
                    <li key={g[0].parcelamento!.grupoId}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="min-w-0 truncate font-semibold">{g[0].descricao ?? nomeCat(g[0].categoriaId)}</span>
                        <span className="valor shrink-0 text-sm text-suave">{pagas}/{g.length} · {formatarBRL(g[0].valor)}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {g.map((l, i) => {
                          const s: SituacaoParcela = l.status === 'pago' ? 'paga' : mesDe(l.data) < mesDe(hoje) ? 'atrasada' : 'a_pagar'
                          return <Ponto key={l.id} i={i} situacao={s} titulo={`${rotuloParcelamento(l.parcelamento!)} · ${rotuloMes(mesDe(l.data))} · ${formatarBRL(l.valor)} · ${ROTULO_SITUACAO[s]}`} />
                        })}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Moldura>
          </Aparecer>
        </div>

        <Aparecer atraso={0.15}>
          <div className="mb-2 flex items-baseline justify-between"><Titulo>Financiamentos</Titulo><Legenda /></div>
          {d.financiamentos.length === 0 && (
            <Moldura><p className="text-sm text-suave">Nenhum financiamento. <Link className="font-semibold text-marca-texto" to="/dividas">Cadastrar pelo carnê</Link></p></Moldura>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            {d.financiamentos.map((f) => {
              const estado = estadoFinanciamento(f, d.lancamentos)
              const trilha = trilhaFinanciamento(f, d.lancamentos, hoje)
              const pagas = trilha.filter((p) => p.situacao === 'paga').length
              const atrasadas = trilha.filter((p) => p.situacao === 'atrasada').length
              // Contrato longo (financiamento de casa tem 240+ parcelas): mostra as últimas pagas e as próximas 36.
              const primeiraAberta = trilha.findIndex((p) => p.situacao !== 'paga')
              const janela = trilha.length <= 60 ? trilha : trilha.slice(Math.max(0, (primeiraAberta < 0 ? trilha.length : primeiraAberta) - 6), (primeiraAberta < 0 ? trilha.length : primeiraAberta) + 36)
              return (
                <Moldura key={f.id}>
                  <div className="flex items-center gap-4">
                    <BemEmMovimento tipo={f.tipo ?? 'outro'} pago={f.totalParcelas > 0 ? pagas / f.totalParcelas : 0}
                      rotulo={`${f.nome}: ${pagas} de ${f.totalParcelas} parcelas pagas`} />
                    <div className="min-w-0 flex-1">
                      <Link to={`/dividas/${f.id}`} className="block truncate font-semibold">{f.nome}</Link>
                      <div className="text-xs text-suave">{pagas}/{f.totalParcelas} pagas · {f.sistema}</div>
                      <div className="valor mt-1 text-lg text-divida">{formatarBRL(estado.saldoDevedor)}</div>
                      <div className="text-xs text-suave">saldo devedor{atrasadas > 0 ? ` · ${atrasadas} atrasada${atrasadas > 1 ? 's' : ''}` : ''}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {janela.map((p, i) => (
                      <Ponto key={p.numero} i={i} situacao={p.situacao}
                        titulo={`${p.numero}/${f.totalParcelas} · ${rotuloMes(p.mes)} · ${formatarBRL(p.valor)} · ${ROTULO_SITUACAO[p.situacao]}`} />
                    ))}
                  </div>
                  {janela.length < trilha.length && (
                    <p className="mt-2 text-xs text-suave">Parcelas {janela[0].numero} a {janela[janela.length - 1].numero} de {trilha.length}; o detalhe completo está na dívida.</p>
                  )}
                </Moldura>
              )
            })}
          </div>
        </Aparecer>

        <Aparecer atraso={0.2}>
          <Moldura>
            <div className="mb-2 flex items-baseline justify-between"><Titulo>Lançamentos de {rotuloMes(mes)}</Titulo><Link to="/lancamentos" className="text-sm font-semibold text-marca-texto">Ver lista</Link></div>
            {doMes.length === 0 && <p className="text-sm text-suave">Nenhum lançamento neste mês.</p>}
            {doMes.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-suave">
                      <th className="py-2 pr-3 font-semibold">Dia</th><th className="pr-3 font-semibold">Descrição</th><th className="pr-3 font-semibold">Categoria</th>
                      <th className="pr-3 text-right font-semibold">Valor</th><th className="pr-3 font-semibold">Situação</th><th />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--linha)]">
                    {doMes.map((l) => (
                      <tr key={l.id} className="transition-colors hover:bg-[var(--casca)]">
                        <td className="py-2 pr-3 valor">{l.data.slice(8)}</td>
                        <td className="max-w-56 truncate pr-3">
                          {nomeLancamento(l)}
                          {l.parcelamento && <span className="ml-2 valor text-xs text-suave">{rotuloParcelamento(l.parcelamento)}</span>}
                        </td>
                        <td className="pr-3 text-suave">{nomeCat(l.categoriaId)}</td>
                        <td className={`valor pr-3 text-right ${l.tipo === 'entrada' ? 'text-positivo' : 'text-negativo'}`}>
                          {l.tipo === 'entrada' ? '+' : '−'} {formatarBRL(l.valor)}
                        </td>
                        <td className="pr-3">
                          {l.status === 'pago'
                            ? <span className="text-xs font-semibold text-positivo">pago</span>
                            : <button className="chip-pendente min-h-8 text-xs font-semibold" onClick={() => repo.lancamentos.salvar({ ...l, status: 'pago' })}>pendente · marcar pago</button>}
                        </td>
                        <td className="text-right">
                          <button aria-label="Editar lançamento" className="size-9 inline-grid place-items-center text-suave" onClick={() => setEditando(l)}>
                            <PencilSimple size={18} weight="light" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Moldura>
        </Aparecer>
      </div>
      {editando && <EditorLancamento key={editando.id} lancamento={editando} fechar={() => setEditando(null)} />}
    </MotionConfig>
  )
}
