import { formatarBRL } from '../../domain/dinheiro'
import { somenteDigitos } from '../validacao'
import { comSinal } from '../valores'

/** Valor em dígitos (centavos) com botão de sinal ±: saldo inicial e saldo real podem ser negativos. */
export function CampoValor({ rotulo, digitos, onDigitos, negativo, onNegativo }: {
  rotulo: string; digitos: string; onDigitos: (d: string) => void; negativo: boolean; onNegativo: (n: boolean) => void
}) {
  return (
    <div className="grid gap-1 text-sm">
      <span>{rotulo}</span>
      <div className="flex gap-2">
        <button type="button" aria-pressed={negativo} aria-label={negativo ? 'Valor negativo (tocar para positivo)' : 'Valor positivo (tocar para negativo)'}
          onClick={() => onNegativo(!negativo)} className="size-11 shrink-0 rounded-xl bg-[var(--casca)] text-lg font-semibold">
          {negativo ? '−' : '+'}
        </button>
        <input inputMode="numeric" aria-label={rotulo} value={digitos} onChange={(e) => onDigitos(somenteDigitos(e.target.value))}
          className="valor min-h-11 w-full rounded-xl bg-[var(--casca)] px-3" />
      </div>
      <span className="text-suave">{formatarBRL(comSinal(digitos, negativo))}</span>
    </div>
  )
}
