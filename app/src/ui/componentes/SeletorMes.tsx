import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { mesAnterior } from '../../domain/meses'
import { NOMES_MES as NOMES } from '../rotulos'

export function SeletorMes({ mes, onChange }: { mes: string; onChange: (m: string) => void }) {
  const [ano, m] = mes.split('-').map(Number)
  return (
    <div className="flex items-center gap-1">
      <button aria-label="Mês anterior" className="size-11 grid place-items-center rounded-full active:scale-95 transition-transform duration-300 ease-[var(--ease)]"
        onClick={() => onChange(mesAnterior(mes, 1))}>
        <CaretLeft size={20} weight="light" />
      </button>
      <span className="min-w-32 text-center font-semibold">{NOMES[m - 1]} <span className="font-normal opacity-70">{ano}</span></span>
      <button aria-label="Próximo mês" className="size-11 grid place-items-center rounded-full active:scale-95 transition-transform duration-300 ease-[var(--ease)]"
        onClick={() => onChange(mesAnterior(mes, -1))}>
        <CaretRight size={20} weight="light" />
      </button>
    </div>
  )
}
