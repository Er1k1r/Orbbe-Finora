import { useState } from 'react'
import { Moldura } from '../componentes/Moldura'
import { FormRapido } from '../componentes/FormRapido'
import { useDados } from '../hooks/useDados'
import { repo, novoId } from '../../data/repo'
import { centavosDeDigitos, formatarBRL } from '../../domain/dinheiro'
import { somenteDigitos } from '../validacao'
import type { FonteDeRenda, TipoFonte } from '../../domain/tipos'

const ROTULOS: Record<TipoFonte, string> = { fixa: 'Fixa', variavel: 'Variável', eventual: 'Eventual' }

export default function Fontes() {
  const d = useDados()
  const [edit, setEdit] = useState<FonteDeRenda | null>(null)
  const [valor, setValor] = useState('')
  const [dia, setDia] = useState('')

  const abrir = (f: FonteDeRenda) => {
    setEdit(f)
    setValor(f.valorEsperado > 0 ? String(f.valorEsperado) : '')
    setDia(f.diaPagamento === undefined ? '' : String(f.diaPagamento))
  }
  const novo = () => abrir({ id: novoId(), nome: '', tipo: 'fixa', valorEsperado: 0 })

  async function salvar() {
    if (!edit || !edit.nome.trim()) return
    // `diaPagamento` é omitido quando não vale: nunca se grava undefined/null (o importador de backup rejeita null).
    const { diaPagamento: _d, ...base } = edit
    await repo.fontes.salvar({
      ...base, nome: edit.nome.trim(), valorEsperado: centavosDeDigitos(valor),
      ...(edit.tipo === 'fixa' && dia ? { diaPagamento: Math.min(31, Math.max(1, Number(dia))) } : {}),
    })
    setEdit(null)
  }

  async function remover(f: FonteDeRenda) {
    if (d.lancamentos.some((l) => l.fonteId === f.id)) { alert('Esta fonte tem entradas registradas.'); return }
    if (confirm(`Remover ${f.nome}?`)) await repo.fontes.remover(f.id)
  }

  return (
    <div className="grid gap-4">
      {d.fontes.map((f) => (
        <Moldura key={f.id}>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">{f.nome}</div>
              <div className="text-xs text-suave">{ROTULOS[f.tipo]}{f.tipo === 'fixa' && f.diaPagamento ? ` · dia ${f.diaPagamento}` : ''}</div>
            </div>
            <div className="valor text-lg">{formatarBRL(f.valorEsperado)}</div>
          </div>
          <div className="mt-3 flex gap-2 text-sm font-semibold">
            <button className="min-h-11 px-3 text-marca-texto" onClick={() => abrir(f)}>Editar</button>
            <button className="min-h-11 px-3 text-negativo" onClick={() => remover(f)}>Remover</button>
          </div>
        </Moldura>
      ))}
      <button onClick={novo} className="min-h-12 rounded-full bg-marca font-semibold text-white">Adicionar fonte de renda</button>

      {edit && (
        <FormRapido titulo="Fonte de renda" onSalvar={salvar} onCancelar={() => setEdit(null)}>
          <label className="grid gap-1 text-sm">Nome<input value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} className="min-h-11 rounded-xl bg-[var(--casca)] px-3" /></label>
          <label className="grid gap-1 text-sm">Tipo
            <select value={edit.tipo} onChange={(e) => setEdit({ ...edit, tipo: e.target.value as TipoFonte })} className="min-h-11 rounded-xl bg-[var(--casca)] px-3">
              {(Object.keys(ROTULOS) as TipoFonte[]).map((t) => <option key={t} value={t}>{ROTULOS[t]}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm">Valor esperado
            <input inputMode="numeric" value={valor} onChange={(e) => setValor(somenteDigitos(e.target.value))} className="valor min-h-11 rounded-xl bg-[var(--casca)] px-3" />
            <span className="text-suave">{formatarBRL(centavosDeDigitos(valor))}</span>
          </label>
          {edit.tipo === 'fixa' && (
            <label className="grid gap-1 text-sm">Dia do pagamento (1 a 31)
              <input inputMode="numeric" value={dia} onChange={(e) => setDia(somenteDigitos(e.target.value).slice(0, 2))} className="valor min-h-11 rounded-xl bg-[var(--casca)] px-3" />
            </label>
          )}
        </FormRapido>
      )}
    </div>
  )
}
