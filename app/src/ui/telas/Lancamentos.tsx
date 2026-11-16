import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { EditorLancamento } from '../componentes/EditorLancamento'
import { Moldura } from '../componentes/Moldura'
import { useDados } from '../hooks/useDados'
import { repo } from '../../data/repo'
import { db } from '../../data/db'
import { formatarBRL } from '../../domain/dinheiro'
import { hojeLocal, mesDe } from '../../domain/meses'
import { cancelarRecorrencia, previstosDoMes } from '../../domain/recorrencia'
import { rotuloMes } from '../rotulos'
import { serieMensal } from '../../domain/painel'
import { ordenarLancamentos, rotuloParcelamento } from '../lancamento'
import { parcelasRestantesDoGrupo } from '../../domain/parcelamento'
import { encerrarRepeticao, excluirSoEsteMes, idsDeExclusao, modeloDaRecorrencia, type EdicaoExclusao } from '../construtores'
import { FormRapido } from '../componentes/FormRapido'
import type { Lancamento } from '../../domain/tipos'

type Filtro = 'todos' | 'entrada' | 'fixas' | 'variaveis' | 'parceladas' | 'financiamentos' | 'transferencias'
const FILTROS: { id: Filtro; rotulo: string; aceita: (l: Lancamento) => boolean }[] = [
  { id: 'todos', rotulo: 'Todos', aceita: () => true },
  { id: 'entrada', rotulo: 'Recebimentos', aceita: (l) => l.tipo === 'entrada' && !l.especie },
  { id: 'fixas', rotulo: 'Despesas fixas', aceita: (l) => l.tipo === 'saida' && !l.especie && !l.parcelamento && !l.financiamentoId && l.natureza === 'fixo' },
  { id: 'variaveis', rotulo: 'Despesas variáveis', aceita: (l) => l.tipo === 'saida' && !l.especie && !l.parcelamento && !l.financiamentoId && l.natureza === 'variavel' },
  { id: 'parceladas', rotulo: 'Parceladas', aceita: (l) => l.parcelamento !== undefined },
  { id: 'financiamentos', rotulo: 'Financiamentos', aceita: (l) => l.financiamentoId !== undefined },
  { id: 'transferencias', rotulo: 'Transferências e ajustes', aceita: (l) => l.especie !== undefined },
]
// Colunas da tabela no computador; no celular cada linha vira um bloco.
const GRADE = 'md:grid md:grid-cols-[5.5rem_minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,0.9fr)_7.5rem_7.5rem_4rem_5.5rem] md:items-center md:gap-3'

function Barra({ rotulo, feito, total, cor, feitoRotulo }: { rotulo: string; feito: number; total: number; cor: string; feitoRotulo: string }) {
  const f = total > 0 ? Math.min(feito / total, 1) : 0
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-extrabold">{rotulo}</span>
        <span className="valor">{new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(f * 100)}%</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-[var(--casa)]">
        <motion.div className="h-full rounded-full" style={{ background: cor }} initial={{ width: 0 }} animate={{ width: `${f * 100}%` }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} />
      </div>
      <dl className="mt-1.5 grid grid-cols-2 gap-x-3 text-xs">
        <dt className="text-suave">{feitoRotulo}</dt><dd className="valor text-right">{formatarBRL(feito)}</dd>
        <dt className="text-suave">Previsto</dt><dd className="valor text-right">{formatarBRL(total)}</dd>
      </dl>
    </div>
  )
}

export default function Lancamentos({ mes, abrirLancamento }: { mes: string; abrirLancamento?: () => void }) {
  const d = useDados()
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const mesAtual = mesDe(hojeLocal())
  const nome = (id: string) => d.categorias.find((c) => c.id === id)?.nome ?? ''
  const nomeConta = (id: string) => d.contas.find((c) => c.id === id)?.nome ?? ''
  const aceita = FILTROS.find((f) => f.id === filtro)!.aceita
  const doMes = d.lancamentos.filter((l) => mesDe(l.data) === mes)
  const itens = ordenarLancamentos(doMes.filter(aceita))

  // Previstos da recorrência para o mês visto (só leitura): respeitam o mesmo filtro.
  const todosPrevistos = previstosDoMes(d.lancamentos, mes)
  const previstos = ordenarLancamentos(todosPrevistos.filter(aceita))

  // Barras do topo: recebido x previsto e pago x previsto (saídas como no Painel, com as parcelas de contrato).
  const entradas = [...doMes, ...todosPrevistos].filter((l) => l.tipo === 'entrada' && !l.especie)
  const recebido = entradas.filter((l) => l.status === 'pago').reduce((s, l) => s + l.valor, 0)
  const aReceber = entradas.reduce((s, l) => s + l.valor, 0)
  const saidas = useMemo(() => serieMensal(d.lancamentos, d.financiamentos, mes, 1, hojeLocal())[0], [d.lancamentos, d.financiamentos, mes])
  const comuns = doMes.filter((l) => !l.especie && l.status === 'pago')
  const saldoMes = comuns.reduce((s, l) => s + (l.tipo === 'entrada' ? l.valor : -l.valor), 0)

  // O modelo da recorrência: o próprio lançamento (modelo) ou aquele de que a cópia nasceu (`origemId`).
  const modeloDe = (l: Lancamento) => modeloDaRecorrencia(l, d.lancamentos)
  const ativo = (m?: Lancamento) => m !== undefined && (m.recorrenciaAte === undefined || m.recorrenciaAte > mesAtual)

  // `{ ...modelo, recorrenciaAte }` (dentro de cancelarRecorrencia) preserva o `geradoAte` do modelo.
  const cancelar = (m: Lancamento) => repo.lancamentos.salvar(cancelarRecorrencia(m, mesAtual))

  const [perguntaExcluir, setPerguntaExcluir] = useState<Lancamento | null>(null)

  const [aviso, setAviso] = useState('')
  const alternarPago = (l: Lancamento) => repo.lancamentos.salvar({ ...l, status: l.status === 'pago' ? 'pendente' : 'pago' })
  const [editando, setEditando] = useState<Lancamento | null>(null)

  async function aplicarEdicao(e: EdicaoExclusao, mensagem = '') {
    await db.transaction('rw', db.lancamentos, async () => {
      await db.lancamentos.bulkDelete(e.apagar)
      await db.lancamentos.bulkPut(e.salvar)
    })
    setPerguntaExcluir(null)
    setAviso(mensagem)
  }

  function encerrar(l: Lancamento) {
    const e = encerrarRepeticao(d.lancamentos, l, mesAtual)
    return aplicarEdicao(e, e.apagar.length === 0 ? 'Repetição encerrada. Este lançamento foi mantido.' : '')
  }

  async function excluir(l: Lancamento) {
    if (l.recorrencia === 'mensal' || l.origemId !== undefined) { setPerguntaExcluir(l); return } // pergunta o que fazer
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
    <div className="grid gap-5">
      <Moldura>
        <div className="grid gap-5 md:grid-cols-[auto_1fr_1fr] md:items-center md:gap-8">
          <div>
            <h1 className="text-[28px] uppercase leading-none">Lançamentos</h1>
            <p className="mt-1 text-sm text-suave">Resultado previsto do mês</p>
            <p className={`valor text-2xl ${aReceber - saidas.pago - saidas.aberto < 0 ? 'text-negativo' : 'text-positivo'}`}>
              {formatarBRL(aReceber - saidas.pago - saidas.aberto)}
            </p>
          </div>
          <Barra rotulo="Recebimentos" feitoRotulo="Recebido" feito={recebido} total={aReceber} cor="var(--verde)" />
          <Barra rotulo="Despesas" feitoRotulo="Pago" feito={saidas.pago} total={saidas.pago + saidas.aberto} cor="var(--vermelho)" />
        </div>
      </Moldura>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0" role="group" aria-label="Filtrar lançamentos">
        {FILTROS.map((f) => (
          <button key={f.id} onClick={() => setFiltro(f.id)} aria-pressed={filtro === f.id}
            className={`vidro min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors ${filtro === f.id ? '!bg-[var(--azul)] text-white' : 'text-marca-texto hover:!bg-[var(--casca)]'}`}>
            {f.rotulo}
          </button>
        ))}
      </div>
      {aviso && <p role="status" className="text-sm text-suave">{aviso}</p>}

      <Moldura className="!p-0 overflow-hidden">
        <div className={`hidden border-b border-[var(--linha)] px-5 py-3 text-xs font-bold text-suave ${GRADE}`} aria-hidden>
          <span>Data</span><span>Descrição</span><span>Categoria</span><span>Conta</span><span>Tipo</span><span className="text-right">Valor</span><span>Pago?</span><span />
        </div>
        {abrirLancamento && (
          <div className="px-3 pt-3 md:px-4">
            <button onClick={abrirLancamento}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[12px] border-2 border-dashed border-[var(--azul)] font-semibold text-marca-texto transition-colors hover:bg-[var(--casca)]">
              <Plus size={18} weight="bold" /> Novo lançamento
            </button>
          </div>
        )}
        {itens.length === 0 && previstos.length === 0 && <p className="px-5 py-6 text-suave">Nenhum lançamento neste mês com esse filtro.</p>}
        <ul className="divide-y divide-[var(--linha)]">
          {itens.map((l) => {
            const modelo = modeloDe(l)
            const fin = d.financiamentos.find((f) => f.id === l.financiamentoId)
            const vencido = l.status === 'pendente' && l.data < hojeLocal()
            const titulo = l.descricao ?? (fin ? fin.nome : nome(l.categoriaId))
            return (
              <li key={l.id} className={`grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 px-5 py-3 transition-colors hover:bg-[var(--casa)] ${GRADE}`}>
                <span className={`valor order-2 text-xs md:order-none md:text-sm ${vencido ? 'text-negativo' : 'text-suave md:text-[var(--texto)]'}`}>
                  {l.data.slice(8)}/{l.data.slice(5, 7)}{vencido && <span className="block font-semibold">venceu</span>}
                </span>
                <span className="order-1 min-w-0 md:order-none">
                  <span className="block truncate font-semibold">{titulo}{l.parcelamento && <span className="valor ml-2 text-xs text-suave md:hidden">{rotuloParcelamento(l.parcelamento)}</span>}</span>
                  <span className="flex flex-wrap gap-x-3 text-xs text-suave">
                    {modelo?.recorrenciaAte && <span>até {rotuloMes(modelo.recorrenciaAte)}</span>}
                    {l.observacao && <span className="truncate">{l.observacao}</span>}
                    {l.parcelamento && parcelasRestantesDoGrupo(d.lancamentos, l.parcelamento.grupoId).length > 0 && (
                      <button className="font-semibold underline-offset-2 hover:underline" onClick={() => excluirRestantes(l.parcelamento!.grupoId)}>Excluir parcelas restantes</button>
                    )}
                    {modelo && ativo(modelo) && (
                      <button className="font-semibold underline-offset-2 hover:underline" onClick={() => cancelar(modelo)}>Cancelar recorrência</button>
                    )}
                  </span>
                </span>
                <span className="hidden truncate text-sm text-suave md:block">{fin ? 'Financiamento' : nome(l.categoriaId)}</span>
                <span className="hidden truncate text-sm text-suave md:block">{nomeConta(l.contaId)}</span>
                <span className="hidden md:block">
                  {l.parcelamento ? <span className="valor rounded-full bg-[var(--azul)] px-2 py-0.5 text-xs text-white">{rotuloParcelamento(l.parcelamento)}</span>
                    : fin ? <span className="text-xs font-semibold text-divida">{l.pagamentoFinanciamento === 'antecipacao' ? 'Antecipação' : 'Parcela'}</span>
                    : modelo ? <span className="text-xs"><span className="block font-semibold">Recorrente</span><span className="text-suave">mensal</span></span>
                    : l.especie ? <span className="text-xs text-suave">{l.especie === 'ajuste' ? 'Ajuste' : 'Transferência'}</span>
                    : <span className="text-xs text-suave">Único</span>}
                </span>
                <span className={`valor order-1 text-right md:order-none ${l.tipo === 'entrada' ? 'text-positivo' : 'text-negativo'}`}>
                  {l.tipo === 'entrada' ? '+' : '−'} {formatarBRL(l.valor)}
                </span>
                <span className="order-2 flex justify-end md:order-none md:justify-start">
                  <button role="switch" aria-checked={l.status === 'pago'} aria-label={`Pago: ${titulo}`} disabled={l.especie !== undefined}
                    onClick={() => alternarPago(l)}
                    className={`relative h-7 w-12 rounded-full transition-colors duration-300 disabled:opacity-50 ${l.status === 'pago' ? 'bg-[var(--verde)]' : 'bg-[var(--linha)]'}`}>
                    <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-[left] duration-300 ease-[var(--ease)] ${l.status === 'pago' ? 'left-6' : 'left-1'}`} />
                  </button>
                </span>
                <span className="order-3 col-start-2 -my-1 flex justify-end gap-0.5 md:order-none md:col-start-auto md:my-0">
                  <button aria-label="Editar lançamento" className="grid size-11 place-items-center rounded-[10px] text-suave hover:bg-[var(--casca)]" onClick={() => setEditando(l)}>
                    <PencilSimple size={20} />
                  </button>
                  <button aria-label="Excluir lançamento" className="grid size-11 place-items-center rounded-[10px] text-suave hover:bg-[var(--casca)] hover:text-negativo" onClick={() => excluir(l)}>
                    <Trash size={20} />
                  </button>
                </span>
              </li>
            )
          })}
          {previstos.map((l) => (
            <li key={l.id} data-previsto className={`grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 px-5 py-3 text-suave ${GRADE}`}>
              <span className="valor order-2 text-xs md:order-none md:text-sm">{l.data.slice(8)}/{l.data.slice(5, 7)}</span>
              <span className="order-1 min-w-0 md:order-none">
                <span className="block truncate">
                  {l.descricao ?? nome(l.categoriaId)}
                  <span className="ml-2 rounded-full border border-[var(--linha)] px-2 py-0.5 text-xs font-semibold">previsto</span>
                </span>
              </span>
              <span className="hidden truncate text-sm md:block">{nome(l.categoriaId)}</span>
              <span className="hidden truncate text-sm md:block">{nomeConta(l.contaId)}</span>
              <span className="hidden text-xs md:block">Recorrente</span>
              <span className="valor order-1 text-right md:order-none">{l.tipo === 'entrada' ? '+' : '−'} {formatarBRL(l.valor)}</span>
              <span className="hidden md:block" /><span className="hidden md:block" />
            </li>
          ))}
        </ul>
        {previstos.length > 0 && <p className="px-5 pt-2 text-xs text-suave">Os previstos são gerados automaticamente quando o mês chegar.</p>}
        <div className="mt-2 flex flex-wrap items-center justify-end gap-x-5 gap-y-1 border-t border-[var(--linha)] px-5 py-3 text-xs">
          <span><i className="mr-1.5 inline-block size-2 rounded-full bg-[var(--verde)]" />Recebido <span className="valor text-positivo">{formatarBRL(recebido)}</span></span>
          <span><i className="mr-1.5 inline-block size-2 rounded-full bg-[var(--vermelho)]" />Pago <span className="valor text-negativo">{formatarBRL(comuns.filter((l) => l.tipo === 'saida').reduce((x, l) => x + l.valor, 0))}</span></span>
          <span>Saldo do mês <span className={`valor ${saldoMes < 0 ? 'text-negativo' : 'text-positivo'}`}>{formatarBRL(saldoMes)}</span></span>
        </div>
      </Moldura>
      {editando && <EditorLancamento key={editando.id} lancamento={editando} fechar={() => setEditando(null)} />}
      {perguntaExcluir && (
        <FormRapido titulo="Excluir lançamento recorrente" onSalvar={() => {}} onCancelar={() => setPerguntaExcluir(null)}
          acoes={
            <div className="grid gap-2">
              <button type="button" onClick={() => aplicarEdicao(excluirSoEsteMes(d.lancamentos, perguntaExcluir))}
                className="min-h-12 rounded-full bg-marca font-semibold text-white">Só este mês</button>
              <button type="button" onClick={() => encerrar(perguntaExcluir)}
                className="min-h-12 rounded-full bg-[var(--casca)] font-semibold">Encerrar a repetição</button>
              <button type="button" onClick={() => setPerguntaExcluir(null)}
                className="min-h-12 rounded-full font-semibold text-suave">Cancelar</button>
            </div>
          }>
          <p className="text-sm text-suave">Só este mês: tira apenas este lançamento e mantém a repetição nos próximos meses.</p>
          <p className="text-sm text-suave">
            Encerrar a repetição: os próximos meses deixam de ser gerados. Este lançamento só é removido se for um mês futuro ainda pendente.
          </p>
        </FormRapido>
      )}
    </div>
  )
}
