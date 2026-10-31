import { useEffect, useRef, type ReactNode } from 'react'
import { useFolhaNoHistorico } from '../hooks/useFolhaNoHistorico'

const FOCAVEIS = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Folha inferior genérica (diálogo): foco no primeiro campo, Escape fecha, Tab fica dentro, foco volta a quem abriu. */
export function FormRapido({ titulo, onSalvar, onCancelar, children }: {
  titulo: string; onSalvar: () => void; onCancelar: () => void; children: ReactNode
}) {
  const painel = useRef<HTMLFormElement>(null)
  useFolhaNoHistorico(true, onCancelar) // Voltar do Android cancela o formulário
  const aoCancelar = useRef(onCancelar)
  useEffect(() => { aoCancelar.current = onCancelar })
  useEffect(() => {
    const origem = document.activeElement as HTMLElement | null
    const campos = painel.current?.querySelectorAll<HTMLElement>('input:not([type=checkbox]), select')
    ;(campos?.[0] ?? painel.current?.querySelector<HTMLElement>(FOCAVEIS))?.focus()
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { aoCancelar.current(); return }
      if (e.key !== 'Tab') return
      const itens = Array.from(painel.current?.querySelectorAll<HTMLElement>(FOCAVEIS) ?? [])
      if (itens.length === 0) return
      const primeiro = itens[0], ultimo = itens[itens.length - 1]
      const ativo = document.activeElement
      if (!painel.current?.contains(ativo)) { e.preventDefault(); primeiro.focus() }
      else if (e.shiftKey && ativo === primeiro) { e.preventDefault(); ultimo.focus() }
      else if (!e.shiftKey && ativo === ultimo) { e.preventDefault(); primeiro.focus() }
    }
    document.addEventListener('keydown', tecla)
    return () => { document.removeEventListener('keydown', tecla); origem?.focus() }
  }, [])
  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/40" onClick={onCancelar}>
      <form ref={painel} role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); onSalvar() }}
        className="mx-auto grid max-h-[92dvh] w-full max-w-md gap-3 overflow-y-auto rounded-t-[2rem] bg-[var(--superficie)] p-5 pb-8">
        <h2 className="text-lg font-semibold">{titulo}</h2>
        {children}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancelar} className="min-h-12 rounded-full bg-[var(--casca)] font-semibold">Cancelar</button>
          <button type="submit" className="min-h-12 rounded-full bg-marca font-semibold text-white">Salvar</button>
        </div>
      </form>
    </div>
  )
}
