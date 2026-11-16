import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { useFolhaNoHistorico } from '../hooks/useFolhaNoHistorico'
import { ITENS } from '../menu'



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
        className={`heroi barra vidro fixed inset-y-0 left-0 z-50 w-[82%] max-w-80 text-[var(--sobre-marinho)] p-4 pt-[calc(2rem+env(safe-area-inset-top))] transition-transform duration-500 ease-[var(--ease)] ${aberto ? 'translate-x-0' : '-translate-x-full'}`}>
        <ul className="grid gap-1">
          {ITENS.map((it, i) =>
            'secao' in it ? (
              <li key={i} className="mb-1 mt-5 px-4 text-xs font-bold text-[var(--sobre-marinho-suave)]">{it.secao}</li>
            ) : (
              <li key={it.para}>
                <NavLink to={it.para} end={it.para === '/'} onClick={fechar}
                  className={({ isActive }) => `flex items-center gap-3 rounded-[10px] px-4 min-h-12 ${isActive ? 'bg-white/15 font-bold text-white neon-texto' : 'text-[var(--sobre-marinho-suave)]'}`}>
                  <it.Icone size={22} /> {it.rotulo}
                </NavLink>
              </li>
            ))}
        </ul>
      </nav>
    </>
  )
}

/** Computador: a barra cobalto fica sempre aberta à esquerda (o Drawer é só do celular). */
export function BarraLateral() {
  return (
    <nav data-sobre-marinho aria-label="Menu lateral"
      className="heroi barra vidro fixed inset-y-0 left-0 z-30 hidden w-64 flex-col px-3 pb-6 pt-7 text-[var(--sobre-marinho)] lg:flex">
      <span className="px-4 pb-6 text-[26px] font-extrabold uppercase leading-none">Finanças<br />Pessoais</span>
      <ul className="grid gap-0.5">
        {ITENS.map((it, i) =>
          'secao' in it ? (
            <li key={i} className="mb-1 mt-5 px-4 text-xs font-bold text-[var(--sobre-marinho-suave)]">{it.secao}</li>
          ) : (
            <li key={it.para}>
              <NavLink to={it.para} end={it.para === '/'}
                className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-[10px] px-4 text-[15px] font-semibold transition-colors ${isActive ? 'bg-white/15 font-bold text-white neon-texto' : 'text-[var(--sobre-marinho-suave)] hover:bg-white/10 hover:text-white'}`}>
                <it.Icone size={20} /> {it.rotulo}
              </NavLink>
            </li>
          ))}
      </ul>
    </nav>
  )
}
