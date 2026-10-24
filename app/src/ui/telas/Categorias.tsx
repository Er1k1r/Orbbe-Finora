import { useState } from 'react'
import { Moldura } from '../componentes/Moldura'
import { FormRapido } from '../componentes/FormRapido'
import { Icone } from '../componentes/Icone'
import { categoriasDaGrade, useDados } from '../hooks/useDados'
import { repo, novoId } from '../../data/repo'
import type { Categoria, TipoLancamento } from '../../domain/tipos'

const ICONES = ['House', 'ForkKnife', 'ShoppingCart', 'GasPump', 'Bus', 'Heartbeat', 'Lightning', 'GraduationCap', 'FilmSlate', 'Bag', 'PawPrint', 'Gift']
const GRUPOS: { tipo: TipoLancamento; titulo: string }[] = [{ tipo: 'saida', titulo: 'Saídas' }, { tipo: 'entrada', titulo: 'Entradas' }]

export default function Categorias() {
  const d = useDados()
  const [edit, setEdit] = useState<Categoria | null>(null)

  const novo = (tipo: TipoLancamento) =>
    setEdit({ id: novoId(), nome: '', icone: ICONES[0], tipo, natureza: 'variavel', essencial: false })

  async function salvar() {
    if (!edit || !edit.nome.trim()) return
    // Categoria de sistema nunca chega aqui (não aparece na lista); `sistema` não é gravado.
    const { sistema: _s, ...base } = edit
    await repo.categorias.salvar({ ...base, nome: edit.nome.trim() })
    setEdit(null)
  }

  async function remover(c: Categoria) {
    if (d.lancamentos.some((l) => l.categoriaId === c.id)) { alert('Esta categoria tem lançamentos.'); return }
    if (confirm(`Remover ${c.nome}?`)) await repo.categorias.remover(c.id)
  }

  return (
    <div className="grid gap-5">
      {GRUPOS.map((g) => (
        <section key={g.tipo} className="grid gap-3" aria-label={g.titulo}>
          <h2 className="px-1 text-sm font-semibold text-suave">{g.titulo}</h2>
          <Moldura>
            <ul className="grid gap-1">
              {categoriasDaGrade(d.categorias, g.tipo).map((c) => (
                <li key={c.id} className="flex items-center gap-2">
                  <span className="grid size-11 place-items-center"><Icone nome={c.icone} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{c.nome}</div>
                    <div className="text-xs text-suave">{c.natureza === 'fixo' ? 'Fixo' : 'Variável'}{c.essencial ? ' · essencial' : ''}</div>
                  </div>
                  <button className="min-h-11 px-3 text-sm font-semibold text-marca-texto" aria-label={`Editar ${c.nome}`} onClick={() => setEdit(c)}>Editar</button>
                  <button className="min-h-11 px-3 text-sm font-semibold text-negativo" aria-label={`Remover ${c.nome}`} onClick={() => remover(c)}>Remover</button>
                </li>
              ))}
            </ul>
          </Moldura>
          <button onClick={() => novo(g.tipo)} className="min-h-12 rounded-full bg-marca font-semibold text-white">
            {g.tipo === 'saida' ? 'Adicionar categoria de saída' : 'Adicionar categoria de entrada'}
          </button>
        </section>
      ))}

      {edit && (
        <FormRapido titulo="Categoria" onSalvar={salvar} onCancelar={() => setEdit(null)}>
          <label className="grid gap-1 text-sm">Nome<input value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} className="min-h-11 rounded-xl bg-[var(--casca)] px-3" /></label>
          <div role="radiogroup" aria-label="Ícone" className="grid grid-cols-6 gap-2">
            {ICONES.map((i) => (
              <button key={i} type="button" role="radio" aria-checked={edit.icone === i} aria-label={i} onClick={() => setEdit({ ...edit, icone: i })}
                className={`grid min-h-11 place-items-center rounded-xl ${edit.icone === i ? 'bg-marca text-white' : 'bg-[var(--casca)]'}`}>
                <Icone nome={i} />
              </button>
            ))}
          </div>
          <label className="grid gap-1 text-sm">Natureza padrão
            <select value={edit.natureza} onChange={(e) => setEdit({ ...edit, natureza: e.target.value as Categoria['natureza'] })} className="min-h-11 rounded-xl bg-[var(--casca)] px-3">
              <option value="variavel">Variável</option><option value="fixo">Fixo</option>
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" className="size-5" checked={edit.essencial} onChange={(e) => setEdit({ ...edit, essencial: e.target.checked })} />
            Essencial (entra no custo de vida)
          </label>
        </FormRapido>
      )}
    </div>
  )
}
