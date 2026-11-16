import { Plus } from '@phosphor-icons/react'

/** Botão de lançar: o marca-texto da folhinha, sempre à mão. */
export function Fab({ onClick }: { onClick: () => void }) {
  return (
    <button aria-label="Novo lançamento" onClick={onClick}
      className="fab fixed bottom-6 right-5 z-20 grid size-16 place-items-center rounded-[20px] bg-[var(--destaque)] text-[var(--sobre-destaque)] hover:bg-[var(--destaque-escuro)] transition-transform duration-300 ease-[var(--ease)] hover:-translate-y-0.5 active:scale-95 lg:bottom-8 lg:right-8"
      style={{ boxShadow: '0 14px 28px -10px rgba(6,30,26,0.45), inset 0 0 0 2px var(--destaque-borda)' }}>
      <Plus size={30} weight="bold" />
    </button>
  )
}
