import { useState } from 'react'
import { Trash } from '@phosphor-icons/react'
import { Moldura } from '../componentes/Moldura'
import { useDados } from '../hooks/useDados'
import { repo } from '../../data/repo'
import { db } from '../../data/db'
import { formatarBRL } from '../../domain/dinheiro'
import { hojeLocal, mesDe } from '../../domain/meses'
import { cancelarRecorrencia } from '../../domain/recorrencia'
import { rotuloMes, rotuloNatureza } from '../rotulos'
import { ordenarLancamentos, rotuloParcelamento } from '../lancamento'
import { parcelasRestantesDoGrupo } from '../../domain/parcelamento'
import { idsDeExclusao } from '../construtores'
import type { Lancamento } from '../../domain/tipos'

export default function Lancamentos({ mes }: { mes: string }) {
  const d = useDados()
  const [filtro, setFiltro] = useState<'todos' | 'entrada' | 'saida'>('todos')
  const mesAtual = mesDe(hojeLocal())
  const nome = (id: string) => d.categorias.find((c) => c.id === id)?.nome ?? ''
  const itens = ordenarLancamentos(d.lancamentos.filter((l) => mesDe(l.data) === mes && (filtro === 'todos' || l.tipo === filtro)))

  // O modelo da recorrência: o próprio lançamento (modelo) ou aquele de que a cópia nasceu (`origemId`).
  const modeloDe = (l: Lancamento) =>
    l.recorrencia === 'mensal' ? l : d.lancamentos.find((m) => m.id === l.origemId && m.recorrencia === 'mensal')
  const ativo = (m?: Lancamento) => m !== undefined && (m.recorrenciaAte === undefined || m.recorrenciaAte > mesAtual)

  // `{ ...modelo, recorrenciaAte }` (dentro de cancelarRecorrencia) preserva o `geradoAte` do modelo.
  const cancelar = (m: Lancamento) => repo.lancamentos.salvar(cancelarRecorrencia(m, mesAtual))

  async function excluir(l: Lancamento) {
    if (!confirm(l.transferenciaId ? 'Excluir esta transferência (as duas pontas)?' : 'Excluir este lançamento?')) return
    await db.lancamentos.bulkDelete(idsDeExclusao(l, d.lancamentos))
  }

  // Compra parcelada: apaga só as parcelas pendentes do grupo; as pagas ficam.
  async function excluirRestantes(grupoId: string) {
    const restantes = parcelasRestantesDoGrupo(d.lancamentos, grupoId)
    if (restantes.length === 0) return
    const total = restantes.reduce((s, x) => s + x.valor, 0)
    if (!confirm(`Excluir as ${restantes.length} parcelas restantes (${formatarBRL(total)})? As parcelas já pagas ficam.`)) return
    await db.lancamentos.bulkDelete(restantes.map((x) => x.id))
  }

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-extrabold">Lançamentos</h1>
      <div className="grid grid-cols-3 rounded-full bg-[var(--casca)] p-1 text-sm">
        {(['todos', 'entrada', 'saida'] as const).map((f) => (
          <button key={f} onClick={() => setFiltro(f)} aria-pressed={filtro === f}
            className={`min-h-11 rounded-full font-semibold ${filtro === f ? 'bg-[var(--superficie)]' : 'text-suave'}`}>
            {f === 'todos' ? 'Todos' : f === 'entrada' ? 'Entradas' : 'Saídas'}
          </button>
        ))}
      </div>
      <Moldura>
        {itens.length === 0 && <p className="text-suave">Nenhum lançamento neste mês.</p>}
        <ul className="divide-y divide-[var(--linha)]">
          {itens.map((l) => {
            const modelo = modeloDe(l)
            const fin = d.financiamentos.find((f) => f.id === l.financiamentoId)
            return (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3">
                <div className="min-w-0">
                  <div className="truncate">
                    {l.descricao ?? nome(l.categoriaId)}
                    {l.parcelamento && <span className="ml-2 valor text-xs text-suave">{rotuloParcelamento(l.parcelamento)}</span>}
                  </div>
                  <div className="text-xs text-suave">
                    {l.data.slice(8)}/{l.data.slice(5, 7)}{l.descricao ? ` · ${nome(l.categoriaId)}` : ''} · {rotuloNatureza(l.natureza)}
                    {l.status === 'pendente' ? ' · pendente' : ''}
                    {fin ? ` · ${l.pagamentoFinanciamento === 'antecipacao' ? 'antecipação' : 'parcela'} de ${fin.nome}` : ''}
                    {modelo?.recorrenciaAte ? ` · recorrência até ${rotuloMes(modelo.recorrenciaAte)}` : ''}
                    {l.observacao ? ` · ${l.observacao}` : ''}
                  </div>
                </div>
                <span className={`valor ${l.tipo === 'entrada' ? 'text-positivo' : 'text-negativo'}`}>
                  {l.tipo === 'entrada' ? '+' : '−'} {formatarBRL(l.valor)}
                </span>
                {l.status === 'pendente' && (
                  <button className="min-h-11 rounded-full px-3 text-sm font-semibold text-marca-texto"
                    onClick={() => repo.lancamentos.salvar({ ...l, status: 'pago' })}>
                    Marcar como pago
                  </button>
                )}
                {l.parcelamento && parcelasRestantesDoGrupo(d.lancamentos, l.parcelamento.grupoId).length > 0 && (
                  <button className="min-h-11 rounded-full px-3 text-sm font-semibold text-suave" onClick={() => excluirRestantes(l.parcelamento!.grupoId)}>
                    Excluir parcelas restantes
                  </button>
                )}
                {modelo && ativo(modelo) && (
                  <button className="min-h-11 rounded-full px-3 text-sm font-semibold text-suave" onClick={() => cancelar(modelo)}>
                    Cancelar recorrência
                  </button>
                )}
                <button aria-label="Excluir lançamento" className="size-11 grid place-items-center text-suave" onClick={() => excluir(l)}>
                  <Trash size={20} weight="light" />
                </button>
              </li>
            )
          })}
        </ul>
      </Moldura>
    </div>
  )
}
