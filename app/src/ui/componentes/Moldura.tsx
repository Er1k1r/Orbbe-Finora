import type { ReactNode } from 'react'

/** Cartão do spec §13 (raio 16 px). `heroi`: cartão-herói em --marinho com texto claro (paleta escura local). */
export function Moldura({ children, className = '', heroi = false }: { children: ReactNode; className?: string; heroi?: boolean }) {
  return (
    <div className={`rounded-[16px] p-1.5 ring-1 ring-[var(--linha)] ${heroi ? 'heroi bg-[var(--marinho)] text-[var(--texto)]' : 'bg-[var(--superficie-2)]'} ${className}`}>
      <div
        className={`rounded-[10px] p-5 ${heroi ? 'bg-[var(--marinho)]' : 'bg-[var(--superficie)]'}`}
        style={{ boxShadow: 'var(--sombra), inset 0 1px 1px rgba(255,255,255,0.12)' }}
      >
        {children}
      </div>
    </div>
  )
}
