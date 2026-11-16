import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useDados } from '../hooks/useDados'
import { casasDoMes, eventosDoMes, type EventoDia } from '../../domain/folhinha'
import { formatarBRL } from '../../domain/dinheiro'
import { hojeLocal } from '../../domain/meses'
import type { Lancamento, Mes } from '../../domain/tipos'

const SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
const COR: Record<EventoDia['situacao'], string> = {
  pago: 'text-[var(--texto-suave)]',
  aberto: 'text-[var(--texto)]',
  vencido: 'text-negativo font-semibold',
}
const curto = (v: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Math.round(v / 100))

/**
 * A folhinha do mês: uma casa por dia com o que entra e o que vence. Domingo em vermelho, hoje com o marca-texto.
 * Tocar num dia abre a lista dele embaixo (no celular as casas só mostram pontos).
 */
export function FolhinhaMes({ mes, editar }: { mes: Mes; editar: (l: Lancamento) => void }) {
  const d = useDados()
  const hoje = hojeLocal()
  const eventos = useMemo(() => {
    const nome = (id: string) => d.categorias.find((c) => c.id === id)?.nome ?? ''
    const m = new Map<string, EventoDia[]>()
    for (const e of eventosDoMes(d.lancamentos, d.financiamentos, mes, hoje, nome)) m.set(e.data, [...(m.get(e.data) ?? []), e])
    return m
  }, [d.lancamentos, d.financiamentos, d.categorias, mes, hoje])
  const [escolhido, setEscolhido] = useState<string | null>(null)
  const dia = escolhido && escolhido.startsWith(mes) ? escolhido : null
  const doDia = dia ? eventos.get(dia) ?? [] : []

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5" role="grid" aria-label="Folhinha do mês">
        {SEMANA.map((s, i) => (
          <div key={s} role="columnheader" className={`px-1 pb-1 text-[11px] font-bold tracking-[0.08em] ${i === 0 ? 'text-negativo' : 'text-suave'}`}>{s}</div>
        ))}
        {casasDoMes(mes).map((data, i) => {
          if (!data) return <div key={`v${i}`} aria-hidden />
          const ev = eventos.get(data) ?? []
          const ehHoje = data === hoje
          const domingo = i % 7 === 0
          const vencido = ev.some((e) => e.situacao === 'vencido')
          const aberto = ev.filter((e) => e.situacao !== 'pago')
          return (
            <button key={data} role="gridcell" aria-selected={dia === data} onClick={() => setEscolhido(dia === data ? null : data)}
              aria-label={`Dia ${Number(data.slice(8))}${ehHoje ? ', hoje' : ''}: ${ev.length === 0 ? 'nada marcado' : ev.map((e) => `${e.nome} ${formatarBRL(e.valor)}`).join(', ')}`}
              style={{ boxShadow: [ehHoje && 'inset 0 0 0 3px var(--destaque)', dia === data && `inset 0 0 0 ${ehHoje ? 5 : 2}px var(--azul)`].filter(Boolean).join(', ') || undefined }}
              className={`group flex min-h-16 flex-col rounded-[10px] p-1.5 text-left transition-[box-shadow,background-color] duration-200 sm:min-h-24 sm:p-2
                ${dia === data ? 'bg-[var(--casca)]' : 'bg-[var(--casa)] hover:bg-[var(--casca)]'}
                `}>
              <span className={`numeral text-[22px] sm:text-[28px] ${domingo || vencido ? 'text-negativo' : ''}`}>{Number(data.slice(8))}</span>
              {/* celular: só pontos */}
              <span className="mt-auto flex gap-[3px] sm:hidden" aria-hidden>
                {ev.some((e) => e.tipo === 'entrada') && <i className="size-1.5 rounded-full bg-[var(--verde)]" />}
                {ev.some((e) => e.tipo === 'saida') && <i className={`size-1.5 rounded-full ${aberto.some((e) => e.tipo === 'saida') ? 'bg-[var(--vermelho)]' : 'bg-[var(--texto-suave)]'}`} />}
              </span>
              <span className="mt-auto hidden w-full gap-0.5 text-[11px] leading-tight sm:grid" aria-hidden>
                {ev.slice(0, 2).map((e) => (
                  <span key={e.id} className={`grid ${COR[e.situacao]}`}>
                    <span className={`truncate ${e.situacao === 'pago' ? 'line-through decoration-1' : ''}`}>{e.nome}</span>
                    <span className={`valor ${e.tipo === 'entrada' ? 'text-positivo' : ''}`}>{e.tipo === 'entrada' ? '+' : '−'}{curto(e.valor)}</span>
                  </span>
                ))}
                {ev.length > 2 && <span className="text-suave">+{ev.length - 2}</span>}
              </span>
            </button>
          )
        })}
      </div>
      <AnimatePresence initial={false}>
        {dia && (
          <motion.div key={dia} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
            className="mt-3 rounded-[12px] bg-[var(--casca)] p-3">
            <h4 className="text-[15px] font-extrabold">Dia {Number(dia.slice(8))}</h4>
            {doDia.length === 0 && <p className="mt-1 text-sm text-suave">Nada marcado neste dia.</p>}
            <ul className="mt-1 divide-y divide-[var(--linha)]">
              {doDia.map((e) => (
                <li key={e.id} className="flex min-h-11 items-center justify-between gap-3 py-1.5 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{e.nome}</span>
                    <span className={`text-xs ${e.situacao === 'vencido' ? 'text-negativo font-semibold' : 'text-suave'}`}>
                      {e.situacao === 'pago' ? (e.tipo === 'entrada' ? 'recebido' : 'pago') : e.situacao === 'vencido' ? 'venceu' : e.origem === 'previsto' ? 'previsto' : 'em aberto'}
                    </span>
                  </span>
                  <span className={`valor shrink-0 ${e.tipo === 'entrada' ? 'text-positivo' : 'text-negativo'}`}>{e.tipo === 'entrada' ? '+' : '−'} {formatarBRL(e.valor)}</span>
                  {e.lancamento && (
                    <button onClick={() => editar(e.lancamento!)} className="min-h-11 shrink-0 rounded-[10px] px-3 font-semibold text-marca-texto hover:bg-[var(--superficie)]">Editar</button>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
