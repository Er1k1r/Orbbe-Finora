import type { ReactNode } from 'react'

/** Folha da folhinha em vidro sobre o fundo ambiente: raio 16, uma elevação. `heroi`: vidro cobalto com texto claro. */
export function Moldura({ children, className = '', heroi = false }: { children: ReactNode; className?: string; heroi?: boolean }) {
  return (
    <div className={`vidro rounded-[16px] p-5 ${heroi ? 'heroi text-[var(--texto)]' : ''} ${className}`}>
      {children}
    </div>
  )
}
