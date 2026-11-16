import { motion } from 'motion/react'
import { ArrowDown, ArrowUp } from '@phosphor-icons/react'
import { Icone } from './Icone'
import { formatarBRL } from '../../domain/dinheiro'
import type { Dre, LinhaComparativo, Reparticao } from '../../domain/analise'
import type { Categoria, Centavos } from '../../domain/tipos'

const pct = (f: number) => `${f > 0 ? '+' : ''}${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(f * 100)}%`
const facil = [0.16, 1, 0.3, 1] as const

/** Variação contra o mês anterior; `bomSobe` diz se subir é bom (receita, sobra) ou ruim (despesa). */
export function Variacao({ atual, anterior, bomSobe }: { atual: Centavos; anterior: Centavos; bomSobe: boolean }) {
  if (anterior === 0) return <span className="text-xs text-suave">sem mês anterior</span>
  const f = (atual - anterior) / Math.abs(anterior)
  if (Math.abs(f) < 0.005) return <span className="text-xs text-suave">igual ao mês anterior</span>
  const bom = f > 0 === bomSobe
  const Seta = f > 0 ? ArrowUp : ArrowDown
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
      <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 font-semibold ${bom ? 'bg-[var(--verde-bg)] text-positivo' : 'bg-[var(--vermelho-bg)] text-negativo'}`}>
        <Seta size={12} weight="bold" aria-hidden /> {Math.abs(f) > 9.99 ? (f > 0 ? '+999%' : '−999%') : pct(f)}
      </span>
      <span className="whitespace-nowrap text-suave">vs mês anterior</span>
    </span>
  )
}

/** Saldo em degraus: inicial do mês, saldo de agora e previsto no fim do mês, ligados por uma linha. */
export function SaldoDegraus({ inicial, saldo, previsto }: { inicial: Centavos; saldo: Centavos; previsto: Centavos }) {
  const passos = [
    { rotulo: 'Inicial do mês', v: inicial, forte: false },
    { rotulo: 'Saldo atual', v: saldo, forte: true },
    { rotulo: 'Previsto no fim do mês', v: previsto, forte: false },
  ]
  return (
    <ol className="relative grid gap-4 pl-7" aria-label="Saldo do mês">
      <span className="absolute bottom-3 left-[9px] top-3 w-0.5 rounded bg-[var(--linha)]" aria-hidden />
      {passos.map((p, i) => (
        <li key={p.rotulo} className="relative">
          <span aria-hidden className={`absolute -left-7 top-1 grid size-5 place-items-center rounded-full ${i === 1 ? 'bg-[var(--destaque)]' : 'border-2 border-[var(--linha)] bg-[var(--marinho)]'}`} />
          <span className={`valor block ${p.forte ? 'text-3xl' : 'text-lg'} ${p.v < 0 ? 'text-negativo' : ''}`}>{formatarBRL(p.v)}</span>
          <span className="text-xs text-[var(--texto-suave)]">{p.rotulo}</span>
        </li>
      ))}
    </ol>
  )
}

/**
 * Comparativo por categoria: barra do gasto deste mês, um traço no valor do mês anterior e a variação.
 * As barras usam a mesma escala (o maior valor entre os dois meses).
 */
export function Comparativo({ linhas, categorias }: { linhas: LinhaComparativo[]; categorias: Categoria[] }) {
  const max = Math.max(1, ...linhas.flatMap((l) => [l.atual, l.anterior]))
  const cat = (id: string) => categorias.find((c) => c.id === id)
  if (linhas.length === 0) return <p className="mt-2 text-sm text-suave">Sem saídas neste mês nem no anterior.</p>
  return (
    <ul className="mt-3 grid gap-3.5">
      {linhas.map((l, i) => {
        const c = cat(l.categoriaId)
        const sobe = l.variacao !== null && l.variacao > 0
        return (
          <li key={l.categoriaId} className="grid grid-cols-[2.25rem_1fr] items-center gap-3">
            <span className="grid size-9 place-items-center rounded-[10px] bg-[var(--casa)] text-[var(--texto-suave)]" aria-hidden><Icone nome={c?.icone ?? ''} size={20} /></span>
            <span className="min-w-0">
              <span className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-semibold">{c?.nome ?? l.categoriaId}</span>
                <span className={`valor shrink-0 text-xs ${l.variacao === null ? 'text-suave' : sobe ? 'text-negativo' : 'text-positivo'}`}>
                  {l.variacao === null ? 'novo' : pct(l.variacao)} · {formatarBRL(l.atual)}
                </span>
              </span>
              <span className="relative mt-1.5 block h-2 rounded-full bg-[var(--casa)]"
                title={`Este mês ${formatarBRL(l.atual)}; mês anterior ${formatarBRL(l.anterior)}`}>
                <motion.span className={`absolute inset-y-0 left-0 rounded-full ${sobe ? 'bg-[var(--vermelho)]' : 'bg-[var(--azul)]'}`}
                  initial={{ width: 0 }} animate={{ width: `${(l.atual / max) * 100}%` }} transition={{ duration: 0.6, delay: i * 0.05, ease: facil }} />
                {l.anterior > 0 && <span aria-hidden className="absolute -top-1 h-4 w-0.5 rounded bg-[var(--texto)]" style={{ left: `${(l.anterior / max) * 100}%` }} />}
              </span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

const FATIAS = [
  { chave: 'fixas', nome: 'Fixas', cor: 'var(--g-fixas)' },
  { chave: 'parceladas', nome: 'Parceladas', cor: 'var(--g-parceladas)' },
  { chave: 'financiamentos', nome: 'Financiamentos', cor: 'var(--g-financiamentos)' },
  { chave: 'variaveis', nome: 'Variáveis', cor: 'var(--g-variaveis)' },
] as const

/** Saídas do mês por recorrência: anel com o total no meio e a legenda com valores. */
export function RoscaRecorrencia({ r }: { r: Reparticao }) {
  const total = FATIAS.reduce((s, f) => s + Math.max(r[f.chave], 0), 0)
  const R = 15.9155 // circunferência 100
  let acumulado = 0
  return (
    <div className="@container mt-3"><div className="grid items-center gap-4 @md:grid-cols-[10rem_1fr]">
      <div className="relative mx-auto size-40" role="img"
        aria-label={FATIAS.map((f) => `${f.nome} ${formatarBRL(r[f.chave])}`).join(', ')}>
        <svg viewBox="0 0 36 36" className="size-full -rotate-90" aria-hidden>
          <circle cx="18" cy="18" r={R} fill="none" stroke="var(--casa)" strokeWidth="4.2" />
          {total > 0 && FATIAS.map((f) => {
            const v = Math.max(r[f.chave], 0) / total * 100
            const inicio = acumulado
            acumulado += v
            return v > 0 && (
              <motion.circle key={f.chave} cx="18" cy="18" r={R} fill="none" stroke={f.cor} strokeWidth="4.2" pathLength={100}
                strokeDashoffset={-inicio} initial={{ strokeDasharray: '0 100' }} animate={{ strokeDasharray: `${Math.max(v - 0.6, 0.4)} ${100 - Math.max(v - 0.6, 0.4)}` }}
                transition={{ duration: 0.8, ease: facil }} />
            )
          })}
        </svg>
        <span className="absolute inset-0 grid place-content-center text-center">
          <span className="valor text-lg">{formatarBRL(total)}</span>
          <span className="text-[11px] text-suave">saídas do mês</span>
        </span>
      </div>
      <ul className="grid gap-1.5 text-sm">
        {FATIAS.map((f) => (
          <li key={f.chave} className="flex items-center justify-between gap-3 rounded-[10px] px-2 py-1.5 hover:bg-[var(--casa)]">
            <span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-full" style={{ background: f.cor }} />{f.nome}</span>
            <span className="valor">{formatarBRL(r[f.chave])}</span>
          </li>
        ))}
      </ul>
    </div>
    </div>
  )
}

/** Resultado previsto em degraus, como um demonstrativo: cada subtotal em negrito, o resultado com a porcentagem da renda. */
const LinhaDre = ({ rotulo, v, sinal }: { rotulo: string; v: Centavos; sinal: '+' | '−' }) => (
  <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
    <span className="inline-flex items-center gap-2 text-suave">
      <span aria-hidden className={`grid size-4 place-items-center rounded-full text-[11px] font-bold text-white ${sinal === '+' ? 'bg-[var(--verde)]' : 'bg-[var(--texto-suave)]'}`}>{sinal}</span>{rotulo}
    </span>
    <span className={`valor ${sinal === '+' ? 'text-positivo' : 'text-negativo'}`}>{sinal === '−' ? '−' : ''} {formatarBRL(v)}</span>
  </div>
)
const SubDre = ({ rotulo, v }: { rotulo: string; v: Centavos }) => (
  <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-[var(--linha)] pt-2 text-sm font-bold">
    <span className="uppercase tracking-[0.04em]">{rotulo}</span><span className={`valor ${v < 0 ? 'text-negativo' : 'text-positivo'}`}>{formatarBRL(v)}</span>
  </div>
)

export function DreMes({ d }: { d: Dre }) {
  return (
    <div className="mt-2">
      <LinhaDre rotulo="Receitas do mês" v={d.receitas} sinal="+" />
      <LinhaDre rotulo="Despesas variáveis" v={d.variaveis} sinal="−" />
      <SubDre rotulo="Depois do dia a dia" v={d.margem} />
      <LinhaDre rotulo="Despesas fixas e parceladas" v={d.fixas} sinal="−" />
      <LinhaDre rotulo="Financiamentos" v={d.financiamentos} sinal="−" />
      <div className="mt-2 flex items-baseline justify-between gap-3 rounded-[12px] bg-[var(--casa)] px-3 py-2.5">
        <span className="font-extrabold">Resultado</span>
        <span className={`valor text-xl ${d.resultado < 0 ? 'text-negativo' : 'text-positivo'}`}>
          {formatarBRL(d.resultado)}{d.pct !== null && <span className="ml-1 text-sm">({new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(d.pct * 100)}%)</span>}
        </span>
      </div>
    </div>
  )
}
