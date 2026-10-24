import { useRef, useState } from 'react'
import { Moldura } from '../componentes/Moldura'
import { Privacidade } from '../componentes/Privacidade'
import { EtapaRenda } from './EtapaRenda'
import { salvarPrefs, type Objetivo } from '../hooks/usePreferencias'
import { importar } from '../../data/backup'

const OBJETIVOS: { id: Objetivo; rotulo: string }[] = [
  { id: 'destino', rotulo: 'Pra onde vai meu dinheiro' },
  { id: 'nao_estourar', rotulo: 'Não estourar o mês' },
  { id: 'contas_em_dia', rotulo: 'Contas e parcelas em dia' },
  { id: 'meta', rotulo: 'Juntar pra uma meta ou reserva' },
]

export default function Onboarding() {
  const [etapa, setEtapa] = useState<'inicio' | 'objetivos' | 'renda'>('inicio')
  const [sel, setSel] = useState<Objetivo[]>([])
  const arquivo = useRef<HTMLInputElement>(null)

  async function restaurar(f: File) {
    if (!confirm('Isso substitui todos os dados atuais. Continuar?')) return
    try { await importar(await f.text()) } catch (e) { alert((e as Error).message) }
  }

  if (etapa === 'renda') return <EtapaRenda />

  if (etapa === 'objetivos')
    return (
      <div className="grid gap-5 pt-4">
        <h1 className="text-2xl font-extrabold">O que você quer resolver primeiro?</h1>
        <p className="text-suave">Escolha quantos quiser. O app se organiza em volta disso.</p>
        {OBJETIVOS.map((o) => {
          const ativo = sel.includes(o.id)
          return (
            <button key={o.id} role="checkbox" aria-checked={ativo}
              onClick={() => setSel(ativo ? sel.filter((x) => x !== o.id) : [...sel, o.id])}
              className={`min-h-14 rounded-2xl px-4 text-left font-semibold ring-1 transition-colors duration-300 ease-[var(--ease)] ${ativo ? 'bg-[var(--casca)] ring-marca' : 'ring-[var(--linha)]'}`}>
              {o.rotulo}
            </button>
          )
        })}
        <button disabled={sel.length === 0}
          onClick={() => { salvarPrefs({ objetivos: sel }); setEtapa('renda') }}
          className="min-h-12 rounded-full bg-marca font-semibold text-white disabled:opacity-40">
          Continuar
        </button>
      </div>
    )

  return (
    <div className="grid gap-5 pt-8">
      <h1 className="text-3xl font-extrabold leading-tight">Controle seus gastos.<br />Fácil assim.</h1>
      <p className="text-suave">Responda 3 perguntas e o app se monta do seu jeito.</p>
      <Moldura><Privacidade /></Moldura>
      <button onClick={() => setEtapa('objetivos')} className="min-h-12 rounded-full bg-marca font-semibold text-white">Montar meu controle</button>
      <p className="text-center text-xs text-suave">Leva menos de 1 minuto · sem cadastro</p>
      <button onClick={() => arquivo.current?.click()} className="min-h-11 text-sm font-semibold text-marca-texto">Já uso · Restaurar backup</button>
      <input ref={arquivo} type="file" accept="application/json" hidden aria-label="Arquivo de backup"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void restaurar(f) }} />
    </div>
  )
}
