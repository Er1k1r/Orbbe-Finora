import { NavLink } from 'react-router-dom'
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

export function Drawer({ aberto, fechar }: { aberto: boolean; fechar: () => void }) {
  return (
    <>
      <div onClick={fechar} aria-hidden
        className={`fixed inset-0 bg-black/40 transition-opacity duration-500 ease-[var(--ease)] ${aberto ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />
      <nav aria-label="Menu" inert={!aberto}
        className={`fixed inset-y-0 left-0 w-[82%] max-w-80 bg-[var(--marinho)] text-[var(--sobre-marinho)] p-4 pt-8 transition-transform duration-500 ease-[var(--ease)] ${aberto ? 'translate-x-0' : '-translate-x-full'}`}>
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
