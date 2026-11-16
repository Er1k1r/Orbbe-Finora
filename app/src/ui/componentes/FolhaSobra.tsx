import { motion } from 'motion/react'
import { formatarBRL } from '../../domain/dinheiro'
import type { Centavos } from '../../domain/tipos'

/** Reais grandes e centavos pequenos, como o preço escrito na folhinha. */
export function Valor({ v, className = '' }: { v: Centavos; className?: string }) {
  const texto = formatarBRL(v)
  const i = texto.lastIndexOf(',')
  return <span className={className}>{texto.slice(0, i)}<span className="text-[0.45em]">{texto.slice(i)}</span></span>
}

/**
 * Sobra do mês na folha cobalto: o número em numerais condensados e a renda repartida em uma régua
 * (despesas, financiamentos, aporte, o que sobra). Sobra negativa pinta a régua de vermelho.
 */
export function FolhaSobra({ receitas, despesas, parcelas, aporte, normal, otimizada }: {
  receitas: Centavos; despesas: Centavos; parcelas: Centavos; aporte: Centavos; normal: Centavos; otimizada: Centavos
}) {
  const negativa = normal < 0
  const base = Math.max(receitas, despesas + parcelas, 1)
  const fatias = negativa
    ? [{ nome: 'Falta', v: base, cor: 'var(--vermelho)' }]
    : [
        { nome: 'Despesas', v: despesas, cor: '#ff8f87' },
        { nome: 'Financiamentos', v: parcelas, cor: '#9fb2ff' },
        { nome: 'Aporte', v: Math.min(aporte, Math.max(normal, 0)), cor: 'var(--destaque)' },
        { nome: 'Sobra', v: Math.max(otimizada, 0), cor: '#7be0a6' },
      ]
  return (
    <div>
      <h2 className="text-[15px] font-bold [font-stretch:100%] text-[var(--texto-suave)]">Sobra do mês</h2>
      <p className={`numeral mt-2 text-[64px] ${negativa ? 'text-[var(--vermelho-texto)]' : ''}`} aria-live="polite"><Valor v={normal} /></p>
      <p className="mt-2 text-sm text-[var(--texto-suave)]">
        {aporte > 0 && !negativa ? <>Otimizada <span className="valor text-[var(--texto)]">{formatarBRL(otimizada)}</span> depois do aporte de <span className="valor text-[var(--texto)]">{formatarBRL(aporte)}</span></> : negativa ? 'As saídas passaram da renda do mês.' : 'Renda menos despesas e parcelas do mês.'}
      </p>
      <div className="mt-4 flex h-3 gap-[2px] overflow-hidden rounded-full bg-white/10" role="img"
        aria-label={fatias.filter((f) => f.v > 0).map((f) => `${f.nome} ${formatarBRL(f.v)}`).join(', ')}>
        {fatias.filter((f) => f.v > 0).map((f, i) => (
          <motion.span key={f.nome} className="block h-full" style={{ background: f.cor, flexGrow: f.v }}
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.7, delay: 0.08 * i, ease: [0.16, 1, 0.3, 1] }}
            title={`${f.nome}: ${formatarBRL(f.v)}`} />
        ))}
      </div>
      {!negativa && (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--texto-suave)]">
          {fatias.filter((f) => f.v > 0).map((f) => (
            <li key={f.nome} className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-full" style={{ background: f.cor }} />{f.nome}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
