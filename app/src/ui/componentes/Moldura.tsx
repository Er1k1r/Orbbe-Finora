import type { ReactNode } from 'react'

/**
 * Folha da folhinha em vidro sobre o fundo ambiente: raio 16, uma elevação. `heroi`: vidro verde com texto claro.
 * `preenchimento` troca o p-5 padrão (tabelas usam p-0) sem precisar de !important.
 */
export function Moldura({ children, className = '', heroi = false, preenchimento = 'p-5' }: {
  children: ReactNode; className?: string; heroi?: boolean; preenchimento?: string
}) {
  return (
    <div className={`vidro rounded-[16px] ${preenchimento} ${heroi ? 'heroi text-[var(--texto)]' : ''} ${className}`}>
      {children}
    </div>
  )
}
