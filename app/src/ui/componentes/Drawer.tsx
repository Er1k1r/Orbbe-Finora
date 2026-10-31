import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { useFolhaNoHistorico } from '../hooks/useFolhaNoHistorico'
import { House, Bank, Receipt, Scales, Lightbulb, Tag, Briefcase, FloppyDisk } from '@phosphor-icons/react'

const ITENS = [
  { para: '/', rotulo: 'Resumo', Icone: House },
  { para: '/contas', rotulo: 'Contas', Icone: Bank },
  { para: '/lancamentos', rotulo: 'Lançamentos', Icone: Receipt },
  { para: '/dividas', rotulo: 'Dívidas', Icone: Scales },
  { secao: 'Analisar' },
  { para: '/insights', rotulo: 'Insights e reserva', Icone: Lightbulb },
  { para: '/categorias', rotulo: 'Categorias', Icone: Tag },
  { secao: 'Configurar' },
  { para: '/fontes', rotulo: 'Fontes de renda', Icone: Briefcase },
  { para: '/backup', rotulo: 'Backup', Icone: FloppyDisk },
] as const

export const ID_MENU = 'menu-principal'

const FOCAVEIS = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Drawer({ aberto, fechar }: { aberto: boolean; fechar: () => void }) {
  const painel = useRef<HTMLElement>(null)
  const origem = useRef<HTMLElement | null>(null)
  useFolhaNoHistorico(aberto, fechar) // Voltar do Android fecha o menu

  // Ao abrir: foco no primeiro link; ao fechar: devolve o foco a quem abriu (botão de menu).
  useEffect(() => {
    if (!aberto) return
    origem.current = document.activeElement as HTMLElement | null
    const t = setTimeout(() => painel.current?.querySelector<HTMLElement>(FOCAVEIS)?.focus(), 0)
    return () => {
      clearTimeout(t)
      origem.current?.focus()
    }
  }, [aberto])

  useEffect(() => {
    if (!aberto) return
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { fechar(); return }
      if (e.key !== 'Tab') return
      const itens = Array.from(painel.current?.querySelectorAll<HTMLElement>(FOCAVEIS) ?? [])
      if (itens.length === 0) return
      const primeiro = itens[0], ultimo = itens[itens.length - 1]
      const ativo = document.activeElement
      if (!painel.current?.contains(ativo)) { e.preventDefault(); primeiro.focus() }
      else if (e.shiftKey && ativo === primeiro) { e.preventDefault(); ultimo.focus() }
      else if (!e.shiftKey && ativo === ultimo) { e.preventDefault(); primeiro.focus() }
    }
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [aberto, fechar])

  return (
    <>
      <div onClick={fechar} aria-hidden
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-500 ease-[var(--ease)] ${aberto ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />
      <nav data-sobre-marinho ref={painel} id={ID_MENU} aria-label="Menu" inert={!aberto}
        className={`fixed inset-y-0 left-0 z-50 w-[82%] max-w-80 bg-[var(--marinho)] text-[var(--sobre-marinho)] p-4 pt-[calc(2rem+env(safe-area-inset-top))] transition-transform duration-500 ease-[var(--ease)] ${aberto ? 'translate-x-0' : '-translate-x-full'}`}>
        <ul className="grid gap-1">
          {ITENS.map((it, i) =>
            'secao' in it ? (
              <li key={i} className="mt-5 mb-1 px-3 text-[10px] uppercase tracking-[0.2em] opacity-60">{it.secao}</li>
            ) : (
              <li key={it.para}>
                <NavLink to={it.para} end={it.para === '/'} onClick={fechar}
                  className={({ isActive }) => `flex items-center gap-3 rounded-full px-4 min-h-12 ${isActive ? 'bg-white/10 text-[var(--destaque)] font-semibold' : ''}`}>
                  <it.Icone size={22} weight="light" /> {it.rotulo}
                </NavLink>
              </li>
            ))}
        </ul>
      </nav>
    </>
  )
}
