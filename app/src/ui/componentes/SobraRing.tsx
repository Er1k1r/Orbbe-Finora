import { formatarBRL } from '../../domain/dinheiro'
import type { Centavos } from '../../domain/tipos'

const R = 52

function Arco({ inicio, pct, cor }: { inicio: number; pct: number; cor: string }) {
  if (pct <= 0) return null
  const cheio = Math.max(pct - 1.5, 0.5)
  return (
    <circle cx="60" cy="60" r={R} fill="none" stroke={cor} strokeWidth="10" strokeLinecap="round"
      pathLength={100} strokeDasharray={`${cheio} ${100 - cheio}`}
      strokeDashoffset={-inicio} transform="rotate(-90 60 60)"
      style={{ transition: 'stroke-dasharray 900ms var(--ease)' }} />
  )
}

export function SobraRing({ normal, otimizada, aporte }: { normal: Centavos; otimizada: Centavos; aporte: Centavos }) {
  const negativa = normal <= 0
  const base = Math.max(normal, 1)
  const pctOtima = negativa ? 100 : Math.max(0, Math.min(100, (Math.max(otimizada, 0) / base) * 100))
  const pctAporte = negativa ? 0 : Math.max(0, Math.min(100 - pctOtima, (aporte / base) * 100))
  return (
    <div className="relative mx-auto size-56" role="img"
      aria-label={`Sobra normal ${formatarBRL(normal)}, sobra otimizada ${formatarBRL(otimizada)}, aporte ${formatarBRL(aporte)}`}>
      <svg viewBox="0 0 120 120" className="size-full" aria-hidden="true">
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--linha)" strokeWidth="10" />
        {negativa ? (
          <Arco inicio={0} pct={100} cor="var(--vermelho)" />
        ) : (
          <>
            <Arco inicio={0} pct={pctOtima} cor="var(--azul)" />
            <Arco inicio={pctOtima} pct={pctAporte} cor="var(--destaque)" />
          </>
        )}
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className="text-[10px] uppercase tracking-[0.2em] text-suave">Sobra normal</span>
        <span className={`valor text-2xl font-medium ${negativa ? 'text-negativo' : ''}`}>{formatarBRL(normal)}</span>
        <span className="mt-1 text-xs text-suave">
          otimizada <span className="valor text-tinta">{formatarBRL(otimizada)}</span>
        </span>
        {aporte > 0 && !negativa && (
          <span className="text-xs text-suave">aporte <span className="valor text-tinta">{formatarBRL(aporte)}</span></span>
        )}
      </div>
    </div>
  )
}
