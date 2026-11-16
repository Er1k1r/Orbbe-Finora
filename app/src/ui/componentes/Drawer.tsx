import { useEffect, useRef } from 'react'
import { CaretDoubleLeft, SidebarSimple } from '@phosphor-icons/react'
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
        <span className="mb-4 block px-4 text-[28px]"><Marca /></span>
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

/** Marca: "Finora" (finanças + ora, o agora). O ponto menta é o "agora" da folhinha. */
export function Marca({ curta = false }: { curta?: boolean }) {
  return (
    <span className="inline-flex items-baseline font-extrabold leading-none tracking-[-0.04em]" aria-label="Finora">
      <span aria-hidden>{curta ? 'F' : 'Finora'}</span>
      <i aria-hidden className="neon ml-0.5 inline-block size-[0.22em] rounded-full bg-[var(--destaque)]" />
    </span>
  )
}

/**
 * Computador: barra lateral fixa à esquerda (o Drawer é só do celular). Recolhida, vira uma faixa de ícones
 * de 80 px com o nome de cada item no `title` e no nome acessível; a escolha fica salva no aparelho.
 */
export function BarraLateral({ recolhida, alternar }: { recolhida: boolean; alternar: () => void }) {
  return (
    <nav data-sobre-marinho aria-label="Menu lateral"
      className={`heroi barra vidro fixed inset-y-0 left-0 z-30 hidden flex-col pb-6 pt-6 text-[var(--sobre-marinho)] transition-[width] duration-300 ease-[var(--ease)] lg:flex ${recolhida ? 'w-20 px-2' : 'w-64 px-3'}`}>
      <div className={`flex items-center pb-5 ${recolhida ? 'flex-col gap-3' : 'justify-between pl-4'}`}>
        <span className="text-[30px]"><Marca curta={recolhida} /></span>
        <button onClick={alternar} aria-expanded={!recolhida} aria-label={recolhida ? 'Expandir menu' : 'Recolher menu'} title={recolhida ? 'Expandir menu' : 'Recolher menu'}
          className="grid size-11 place-items-center rounded-[10px] text-[var(--sobre-marinho-suave)] transition-colors hover:bg-white/10 hover:text-white">
          {recolhida ? <SidebarSimple size={22} /> : <CaretDoubleLeft size={20} />}
        </button>
      </div>
      <ul className="grid gap-0.5">
        {ITENS.map((it, i) =>
          'secao' in it ? (
            recolhida
              ? <li key={i} aria-hidden className="mx-3 my-3 h-px bg-white/10" />
              : <li key={i} className="mb-1 mt-5 px-4 text-xs font-bold text-[var(--sobre-marinho-suave)]">{it.secao}</li>
          ) : (
            <li key={it.para}>
              <NavLink to={it.para} end={it.para === '/'} title={recolhida ? it.rotulo : undefined} aria-label={recolhida ? it.rotulo : undefined}
                className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-[10px] text-[15px] font-semibold transition-colors ${recolhida ? 'justify-center px-0' : 'px-4'} ${isActive ? 'bg-white/15 font-bold text-white neon-texto' : 'text-[var(--sobre-marinho-suave)] hover:bg-white/10 hover:text-white'}`}>
                <it.Icone size={recolhida ? 22 : 20} /> {!recolhida && it.rotulo}
              </NavLink>
            </li>
          ))}
      </ul>
    </nav>
  )
}
