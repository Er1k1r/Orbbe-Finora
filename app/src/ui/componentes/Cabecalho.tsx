import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CaretLeft, CaretRight, List } from '@phosphor-icons/react'
import { BotaoTema } from './BotaoTema'
import { ID_MENU, Marca } from './Drawer'
import { useDados } from '../hooks/useDados'
import { eventosDoMes, semanaDe, type EventoDia } from '../../domain/folhinha'
import { hojeLocal, mesAnterior, mesDe } from '../../domain/meses'
import { NOMES_MES } from '../rotulos'

const DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
const DIAS_LONGOS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

const diaDaSemana = (data: string) => {
  const [a, m, d] = data.split('-').map(Number)
  return new Date(a, m - 1, d).getDay()
}

/** Faixa da semana de hoje: 7 casas, hoje em marca-texto, pontos do que entra (verde) e do que sai (vermelho). */
function Semana({ hoje }: { hoje: string }) {
  const d = useDados()
  const dias = semanaDe(hoje)
  const porDia = useMemo(() => {
    const nome = (id: string) => d.categorias.find((c) => c.id === id)?.nome ?? ''
    const meses = [...new Set(dias.map(mesDe))]
    const m = new Map<string, EventoDia[]>()
    for (const mes of meses) for (const e of eventosDoMes(d.lancamentos, d.financiamentos, mes, hoje, nome)) m.set(e.data, [...(m.get(e.data) ?? []), e])
    return m
  }, [d.lancamentos, d.financiamentos, d.categorias, hoje]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <ol className="mt-4 grid grid-cols-7 gap-1" aria-label="Esta semana">
      {dias.map((dia, i) => {
        const ev = porDia.get(dia) ?? []
        const entra = ev.some((e) => e.tipo === 'entrada' && e.situacao !== 'pago')
        const sai = ev.some((e) => e.tipo === 'saida' && e.situacao !== 'pago')
        const ehHoje = dia === hoje
        const resumo = ev.length === 0 ? 'nada marcado' : ev.map((e) => e.nome).join(', ')
        return (
          <li key={dia} aria-current={ehHoje ? 'date' : undefined} aria-label={`${DIAS_LONGOS[i]} ${Number(dia.slice(8))}: ${resumo}`}
            className={`rounded-[10px] pb-1.5 pt-1 text-center ${ehHoje ? 'neon neon-pulso bg-[var(--destaque)] text-[var(--sobre-destaque)]' : 'bg-white/10'}`}>
            <span className={`block text-xs font-bold ${ehHoje ? '' : i === 0 ? 'text-[#ffb4ae]' : 'opacity-75'}`}>{DIAS[i]}</span>
            <span className={`numeral block text-[22px] ${!ehHoje && i === 0 ? 'text-[#ffb4ae]' : ''}`}>{Number(dia.slice(8))}</span>
            <span className="mt-1 flex h-1.5 justify-center gap-[3px]" aria-hidden>
              {entra && <i className={`size-1.5 rounded-full ${ehHoje ? 'bg-[var(--verde)]' : 'bg-[#7be0a6]'}`} />}
              {sai && <i className={`size-1.5 rounded-full ${ehHoje ? 'bg-[var(--vermelho)]' : 'bg-[#ff8f87]'}`} />}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Cabeçalho-folhinha: número grande (dia de hoje no mês corrente, o número do mês nos outros), nome do mês e as
 * setas. Trocar de mês "arranca a folha": a atual sobe e some, a nova assenta.
 */
export function Cabecalho({ mes, setMes, mostraMes, titulo, semana, virar = true, abrirMenu, menuAberto }: {
  mes: string; setMes: (m: string) => void; mostraMes: boolean; titulo: string; semana: boolean; virar?: boolean
  abrirMenu: () => void; menuAberto: boolean
}) {
  const hoje = hojeLocal()
  const atual = mes === mesDe(hoje)
  const [ano, m] = mes.split('-').map(Number)
  const [direcao, setDirecao] = useState(1)
  const trocar = (n: number) => { setDirecao(n); setMes(mesAnterior(mes, -n)) }

  return (
    <header data-sobre-marinho className="heroi barra vidro px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] text-[var(--sobre-marinho)] lg:mx-0 lg:mt-6 lg:rounded-[16px] lg:px-6 lg:pb-5 lg:pt-4">
      <div className="mx-auto max-w-3xl lg:max-w-none">
      <div className="flex items-center justify-between lg:hidden">
        <button aria-label="Abrir menu" aria-expanded={menuAberto} aria-controls={ID_MENU} className="grid size-11 place-items-center rounded-xl lg:hidden" onClick={abrirMenu}>
          <List size={26} />
        </button>
        <span className="text-[22px]"><Marca /></span>
        <BotaoTema />
      </div>
      {mostraMes ? (
        <div className="mt-1 flex items-end justify-between gap-3">
          <div className="flex min-w-0 items-end gap-3 [perspective:600px]">
            <AnimatePresence mode="popLayout" initial={false} custom={direcao}>
              <motion.div key={mes} className="flex min-w-0 items-end gap-3 origin-top"
                custom={direcao}
                variants={{
                  entra: (dir: number) => ({ opacity: 0, y: dir > 0 ? 18 : -18, rotateX: dir > 0 ? -25 : 25 }),
                  fica: { opacity: 1, y: 0, rotateX: 0 },
                  sai: (dir: number) => ({ opacity: 0, y: dir > 0 ? -26 : 26, rotateX: dir > 0 ? 55 : -55 }),
                }}
                initial="entra" animate="fica" exit="sai" transition={virar ? { duration: 0.42, ease: [0.16, 1, 0.3, 1] } : { duration: 0 }}>
                <span className={`numeral text-[clamp(60px,19vw,76px)] lg:text-[88px] ${atual ? 'neon-texto' : ''}`} aria-hidden>{atual ? Number(hoje.slice(8)) : String(m).padStart(2, '0')}</span>
                <span className="min-w-0 pb-1">
                  <span className="block truncate text-[clamp(20px,6.4vw,28px)] font-extrabold uppercase leading-[0.95] lg:text-[34px]">{NOMES_MES[m - 1]}</span>
                  <span className="block text-[15px] font-semibold text-[var(--sobre-marinho-suave)]">
                    {ano}{atual ? ` · ${DIAS_LONGOS[diaDaSemana(hoje)]}` : ''}
                  </span>
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex shrink-0 items-center gap-1 pb-1">
            {!atual && (
              <button onClick={() => { setDirecao(mes > mesDe(hoje) ? -1 : 1); setMes(mesDe(hoje)) }}
                className="min-h-11 rounded-xl px-3 text-sm font-semibold underline decoration-[var(--destaque)] decoration-2">Hoje</button>
            )}
            <button aria-label="Mês anterior" onClick={() => trocar(-1)} className="grid size-11 place-items-center rounded-xl bg-white/10 transition-transform active:scale-95">
              <CaretLeft size={20} weight="bold" />
            </button>
            <button aria-label="Próximo mês" onClick={() => trocar(1)} className="grid size-11 place-items-center rounded-xl bg-white/10 transition-transform active:scale-95">
              <CaretRight size={20} weight="bold" />
            </button>
            <span className="ml-2 hidden lg:block"><BotaoTema /></span>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-between lg:mt-1">
          <h1 className="text-[34px] uppercase leading-none lg:text-[44px]"><span>{titulo}</span></h1>
          <span className="hidden lg:block"><BotaoTema /></span>
        </div>
      )}
      {mostraMes && semana && atual && <Semana hoje={hoje} />}
      </div>
    </header>
  )
}
