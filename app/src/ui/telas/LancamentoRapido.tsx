import { useEffect, useRef, useState } from 'react'
import { Icone } from '../componentes/Icone'
import { categoriasDaGrade, useDados } from '../hooks/useDados'
import { repo, novoId } from '../../data/repo'
import { db } from '../../data/db'
import { centavosDeDigitos, formatarBRL } from '../../domain/dinheiro'
import { estadoFinanciamento } from '../../domain/fluxo'
import { hojeLocal, mesDe } from '../../domain/meses'
import { criarParcelamento, resumoParcelamento } from '../../domain/parcelamento'
import { avisoParcela, textoPrevia } from '../lancamento'
import { dataReal, somenteDigitos } from '../validacao'
import type { Categoria, Lancamento, PagamentoFinanciamento, TipoLancamento } from '../../domain/tipos'

const FOCAVEIS = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function LancamentoRapido({ fechar }: { fechar: () => void }) {
  const d = useDados()
  const { categorias: todasCategorias, lancamentos } = d
  const [tipo, setTipo] = useState<TipoLancamento>('saida')
  const [digitos, setDigitos] = useState('')
  const [descricao, setDescricao] = useState('')
  const [mais, setMais] = useState(false)
  const [modo, setModo] = useState<'comum' | 'parcelado' | 'financiamento'>('comum')
  const [data, setData] = useState(hojeLocal())
  const [obs, setObs] = useState('')
  const [pendente, setPendente] = useState(false)
  const [repete, setRepete] = useState(false)
  const [ate, setAte] = useState('') // 'YYYY-MM' (último mês da recorrência), opcional
  const [contaId, setContaId] = useState('')
  const [fonteId, setFonteId] = useState('')
  const [totalParc, setTotalParc] = useState('') // parcelado: total de parcelas
  const [parcAtual, setParcAtual] = useState('1') // parcelado: qual é a parcela deste mês
  const [financId, setFinancId] = useState('')
  const [pagTipo, setPagTipo] = useState<PagamentoFinanciamento>('parcela')
  const [natureza, setNatureza] = useState<'auto' | 'fixo' | 'variavel'>('auto')
  const valor = centavosDeDigitos(digitos)
  const campo = useRef<HTMLInputElement>(null)
  const painel = useRef<HTMLDivElement>(null)
  const efetivo = tipo === 'saida' ? modo : 'comum' // entrada nunca é parcelada nem pagamento de contrato

  // Diálogo: foco vai para o valor ao abrir e volta a quem abriu (o FAB) ao fechar; Escape fecha; Tab fica dentro.
  const aoFechar = useRef(fechar)
  useEffect(() => { aoFechar.current = fechar })
  useEffect(() => {
    const origem = document.activeElement as HTMLElement | null
    campo.current?.focus()
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { aoFechar.current(); return }
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

  // Categorias de sistema (transferência, ajuste) nunca entram na grade.
  const categorias = (() => {
    const usos = new Map<string, number>()
    lancamentos.forEach((l) => usos.set(l.categoriaId, (usos.get(l.categoriaId) ?? 0) + 1))
    return categoriasDaGrade(todasCategorias, tipo).sort((a, b) => (usos.get(b.id) ?? 0) - (usos.get(a.id) ?? 0))
  })()

  // Parcela do contrato que um pagamento do tipo "parcela" consome (a próxima em aberto).
  const financ = d.financiamentos.find((f) => f.id === financId)
  const proxima = financ ? estadoFinanciamento(financ, d.lancamentos).restantes[0] : undefined
  const aviso = efetivo === 'financiamento' && pagTipo === 'parcela' ? avisoParcela(valor, proxima?.parcela) : null

  // Prévia do parcelado: quantas faltam, quanto falta pagar e o mês da última.
  const previa = (() => {
    if (efetivo !== 'parcelado' || valor <= 0 || !dataReal(data)) return null
    try {
      return resumoParcelamento(criarParcelamento({
        grupoId: 'previa', valorParcela: valor, total: Number(totalParc), parcelaAtual: Number(parcAtual),
        dataParcelaAtual: data, statusAtual: pendente ? 'pendente' : 'pago',
        base: { tipo: 'saida', categoriaId: '', natureza: 'variavel', contaId: '' },
      }))
    } catch { return null } // total/parcela atual inválidos: sem prévia
  })()

  function escolherFinanciamento(id: string, tipoPag: PagamentoFinanciamento) {
    setFinancId(id)
    setPagTipo(tipoPag)
    const f = d.financiamentos.find((x) => x.id === id)
    const prox = f && estadoFinanciamento(f, d.lancamentos).restantes[0]
    // Em "Parcela", o valor vem preenchido com a parcela do contrato (só se ainda não há valor).
    if (prox && tipoPag === 'parcela' && valor === 0) setDigitos(somenteDigitos(String(prox.parcela)))
  }

  async function salvar(c: Categoria) {
    if (valor <= 0) { campo.current?.focus(); return }
    if (!dataReal(data)) { alert('Informe uma data válida.'); return } // nunca grava data vazia/inválida
    const desc = descricao.trim()
    const base = {
      tipo, categoriaId: c.id, natureza: natureza === 'auto' ? c.natureza : natureza,
      contaId: contaId || d.contas[0]?.id || '',
      ...(desc ? { descricao: desc } : {}),
      ...(obs.trim() ? { observacao: obs.trim() } : {}),
    }
    if (efetivo === 'parcelado') {
      try {
        // grupo inteiro (parcela atual até a última) numa operação só; ids `${grupoId}:${n}`
        await db.lancamentos.bulkPut(criarParcelamento({
          grupoId: novoId(), valorParcela: valor, total: Number(totalParc), parcelaAtual: Number(parcAtual),
          dataParcelaAtual: data, statusAtual: pendente ? 'pendente' : 'pago', base,
        }))
      } catch (e) { alert((e as Error).message); return }
      fechar()
      return
    }
    if (efetivo === 'financiamento' && !financId) { alert('Escolha o financiamento.'); return }
    if (repete && ate && ate < mesDe(data)) { alert('O fim da recorrência deve ser depois da data do lançamento.'); return }
    const fonte = fonteId || d.fontes[0]?.id
    const l: Lancamento = {
      ...base, id: novoId(), valor, data, status: pendente ? 'pendente' : 'pago',
      ...(tipo === 'entrada' && fonte ? { fonteId: fonte } : {}),
      ...(efetivo === 'financiamento' ? { financiamentoId: financId, pagamentoFinanciamento: pagTipo } : {}),
      ...(repete && efetivo === 'comum' ? { recorrencia: 'mensal' as const, ...(ate ? { recorrenciaAte: ate } : {}) } : {}),
    }
    await repo.lancamentos.salvar(l)
    fechar()
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/40" onClick={fechar}>
      <div ref={painel} role="dialog" aria-modal="true" aria-label="Novo lançamento" onClick={(e) => e.stopPropagation()}
        className="relative mx-auto max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[2rem] bg-[var(--superficie)] p-5 pb-8">
        <div role="tablist" aria-label="Tipo de lançamento" className="grid grid-cols-2 rounded-full bg-[var(--casca)] p-1">
          {(['saida', 'entrada'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tipo === t} onClick={() => setTipo(t)}
              className={`min-h-11 rounded-full font-semibold transition-colors duration-300 ease-[var(--ease)] ${tipo === t ? (t === 'saida' ? 'bg-negativo text-white' : 'bg-positivo text-white') : 'text-suave'}`}>
              {t === 'saida' ? 'Saída' : 'Entrada'}
            </button>
          ))}
        </div>

        <label className="mt-5 block text-center">
          <span className="sr-only">Valor em centavos</span>
          <input ref={campo} inputMode="numeric" value={digitos}
            onChange={(e) => setDigitos(somenteDigitos(e.target.value))}
            className="pointer-events-none absolute opacity-0" />
          <span aria-hidden onClick={() => campo.current?.focus()} className="valor block text-4xl font-medium">{formatarBRL(valor)}</span>
          {efetivo === 'parcelado' && <span className="text-xs text-suave">valor de cada parcela</span>}
        </label>

        <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição (opcional)" aria-label="Descrição"
          className="mt-4 min-h-11 w-full rounded-xl bg-[var(--casca)] px-3 text-sm" />

        <div className="mt-4 grid grid-cols-4 gap-2">
          {categorias.map((c) => (
            <button key={c.id} onClick={() => salvar(c)}
              className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl bg-[var(--casca)] p-2 text-center text-[11px] leading-tight transition-transform duration-300 ease-[var(--ease)] active:scale-95">
              <Icone nome={c.icone} />
              {c.nome}
            </button>
          ))}
        </div>

        <button onClick={() => setMais(!mais)} aria-expanded={mais} className="mt-4 min-h-11 text-sm font-semibold text-marca-texto">
          {mais ? 'Menos opções' : 'Mais opções'}
        </button>
        {mais && (
          <div className="mt-2 grid gap-3 text-sm">
            {tipo === 'saida' && (
              <label className="grid gap-1">Tipo de saída
                <select value={modo} onChange={(e) => setModo(e.target.value as typeof modo)} className="min-h-11 rounded-xl bg-[var(--casca)] px-3">
                  <option value="comum">Comum</option>
                  <option value="parcelado">Parcelado</option>
                  {d.financiamentos.length > 0 && <option value="financiamento">Pagamento de financiamento</option>}
                </select>
              </label>
            )}
            {efetivo === 'parcelado' && (
              <>
                <label className="grid gap-1">Total de parcelas
                  <input inputMode="numeric" value={totalParc} onChange={(e) => setTotalParc(somenteDigitos(e.target.value))} placeholder="12" className="valor min-h-11 rounded-xl bg-[var(--casca)] px-3" />
                </label>
                <label className="grid gap-1">Qual é a parcela deste mês?
                  <input inputMode="numeric" value={parcAtual} onChange={(e) => setParcAtual(somenteDigitos(e.target.value))} placeholder="1" className="valor min-h-11 rounded-xl bg-[var(--casca)] px-3" />
                </label>
                {previa && <p className="text-suave">{textoPrevia(previa, pendente)}</p>}
              </>
            )}
            {efetivo === 'financiamento' && (
              <>
                <label className="grid gap-1">Financiamento
                  <select value={financId} onChange={(e) => escolherFinanciamento(e.target.value, pagTipo)} className="min-h-11 rounded-xl bg-[var(--casca)] px-3">
                    <option value="">Escolha…</option>
                    {d.financiamentos.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </select>
                </label>
                <div role="radiogroup" aria-label="Tipo de pagamento" className="grid grid-cols-2 rounded-full bg-[var(--casca)] p-1">
                  {(['parcela', 'antecipacao'] as const).map((p) => (
                    <button key={p} role="radio" aria-checked={pagTipo === p} onClick={() => escolherFinanciamento(financId, p)}
                      className={`min-h-11 rounded-full font-semibold ${pagTipo === p ? 'bg-[var(--superficie)]' : 'text-suave'}`}>
                      {p === 'parcela' ? 'Parcela' : 'Antecipação'}
                    </button>
                  ))}
                </div>
                {pagTipo === 'parcela' && proxima && <p className="text-suave">Parcela do contrato: {formatarBRL(proxima.parcela)}</p>}
                {aviso && <p role="alert" className="aviso">{aviso}</p>}
              </>
            )}
            <label className="grid gap-1">{efetivo === 'parcelado' ? 'Data desta parcela' : 'Data'}<input type="date" value={data} onChange={(e) => setData(e.target.value)} className="min-h-11 rounded-xl bg-[var(--casca)] px-3" /></label>
            <label className="grid gap-1">Conta
              <select value={contaId || d.contas[0]?.id || ''} onChange={(e) => setContaId(e.target.value)} className="min-h-11 rounded-xl bg-[var(--casca)] px-3">
                {d.contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </label>
            {tipo === 'entrada' && (
              <label className="grid gap-1">Fonte de renda
                <select value={fonteId || d.fontes[0]?.id || ''} onChange={(e) => setFonteId(e.target.value)} className="min-h-11 rounded-xl bg-[var(--casca)] px-3">
                  {d.fontes.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </label>
            )}
            <label className="grid gap-1">Natureza
              <select value={natureza} onChange={(e) => setNatureza(e.target.value as typeof natureza)} className="min-h-11 rounded-xl bg-[var(--casca)] px-3">
                <option value="auto">Padrão da categoria</option><option value="fixo">Fixo</option><option value="variavel">Variável</option>
              </select>
            </label>
            <label className="grid gap-1">Observação<input value={obs} onChange={(e) => setObs(e.target.value)} className="min-h-11 rounded-xl bg-[var(--casca)] px-3" /></label>
            <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={pendente} onChange={(e) => setPendente(e.target.checked)} className="size-5" />{efetivo === 'parcelado' ? 'Esta parcela ainda não foi paga' : 'Ainda não foi pago/recebido'}</label>
            {efetivo === 'comum' && (
              <>
                <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={repete} onChange={(e) => setRepete(e.target.checked)} className="size-5" />Repete todo mês</label>
                {repete && (
                  <label className="grid gap-1">Termina em (opcional)
                    <input type="month" value={ate} onChange={(e) => setAte(e.target.value)} className="min-h-11 rounded-xl bg-[var(--casca)] px-3" />
                  </label>
                )}
              </>
            )}
          </div>
        )}
        <p className="mt-3 text-center text-xs text-suave">Digite o valor e toque na categoria para salvar.</p>
      </div>
    </div>
  )
}
