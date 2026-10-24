import { Plus } from '@phosphor-icons/react'

export function Fab({ onClick }: { onClick: () => void }) {
  return (
    <button aria-label="Novo lançamento" onClick={onClick}
      className="fixed bottom-6 right-5 size-14 rounded-full bg-[var(--destaque)] text-[var(--marinho)] grid place-items-center active:scale-95 transition-transform duration-300 ease-[var(--ease)]"
      style={{ boxShadow: '0 16px 32px -12px rgba(13,43,48,0.55)' }}>
      <Plus size={26} weight="light" />
    </button>
  )
}
