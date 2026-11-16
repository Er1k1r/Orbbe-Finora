import type { ReactNode } from 'react'

/** Folha da folhinha: branca sobre o papel, raio 16, uma sombra só. `heroi`: folha cobalto com texto claro. */
export function Moldura({ children, className = '', heroi = false }: { children: ReactNode; className?: string; heroi?: boolean }) {
  return (
    <div className={`rounded-[16px] p-5 ${heroi ? 'heroi bg-[var(--marinho)] text-[var(--texto)]' : 'bg-[var(--superficie)]'} ${className}`}
      style={{ boxShadow: 'var(--sombra)' }}>
      {children}
    </div>
  )
}
