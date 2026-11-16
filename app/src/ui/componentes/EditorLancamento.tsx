import { useRef, useState } from 'react'
import { FormRapido } from './FormRapido'
import { useDados, categoriasDaGrade } from '../hooks/useDados'
import { aplicarEdicao, camposDe, podeEditar, type CamposEdicao } from '../edicao'
import { formatarBRL } from '../../domain/dinheiro'
import { somenteDigitos } from '../validacao'
import { db } from '../../data/db'
import type { Lancamento } from '../../domain/tipos'

const entrada = 'min-h-11 rounded-xl bg-[var(--casca)] px-3'

/** Editor de um lançamento já gravado (folha no celular, diálogo no computador). Grava tudo numa transação. */
export function EditorLancamento({ lancamento, fechar }: { lancamento: Lancamento; fechar: () => void }) {
  const d = useDados()
  const pode = podeEditar(lancamento)
  const [c, setC] = useState<CamposEdicao>(() => camposDe(lancamento))
  const [digitos, setDigitos] = useState(String(lancamento.valor))
  const [erro, setErro] = useState('')
  const ocupado = useRef(false)
  const campo = <K extends keyof CamposEdicao>(k: K, v: CamposEdicao[K]) => setC((x) => ({ ...x, [k]: v }))
  const categorias = categoriasDaGrade(d.categorias, lancamento.tipo)

  async function salvar() {
    if (ocupado.current) return
    const r = aplicarEdicao(lancamento, { ...c, valor: Number(digitos || '0') }, d.lancamentos)
    if ('erro' in r) { setErro(r.erro); return }
    ocupado.current = true
    try {
      await db.transaction('rw', db.lancamentos, () => db.lancamentos.bulkPut(r.salvar))
      fechar()
    } finally { ocupado.current = false }
  }

  if (!pode.editavel) {
    return (
      <FormRapido titulo="Editar lançamento" onSalvar={fechar} onCancelar={fechar}>
        <p className="text-sm text-suave">Ajustes de saldo não podem ser editados. Para corrigir, use “Conferir saldo” na tela de Contas.</p>
      </FormRapido>
    )
  }
  return (
    <FormRapido titulo="Editar lançamento" onSalvar={salvar} onCancelar={fechar}>
      <label className="grid gap-1 text-sm">Descrição
        <input value={c.descricao} onChange={(e) => campo('descricao', e.target.value)} className={entrada} />
      </label>
      <label className="grid gap-1 text-sm">Valor
        <input inputMode="numeric" value={digitos} onChange={(e) => setDigitos(somenteDigitos(e.target.value))} className={`valor ${entrada}`} />
        <span className="text-suave">{formatarBRL(Number(digitos || '0'))}</span>
      </label>
      <label className="grid gap-1 text-sm">Data
        <input type="date" value={c.data} onChange={(e) => campo('data', e.target.value)} className={entrada} />
      </label>
      {pode.modelo && <p className="text-xs text-suave">Este lançamento se repete todo mês: a mudança vale para as próximas cópias.</p>}
      {pode.categoria && (
        <label className="grid gap-1 text-sm">Categoria
          <select value={c.categoriaId} onChange={(e) => campo('categoriaId', e.target.value)} className={entrada}>
            {categorias.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </select>
        </label>
      )}
      {pode.conta && (
        <label className="grid gap-1 text-sm">Conta
          <select value={c.contaId} onChange={(e) => campo('contaId', e.target.value)} className={entrada}>
            {d.contas.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </select>
        </label>
      )}
      {pode.natureza && (
        <label className="grid gap-1 text-sm">Natureza
          <select value={c.natureza} onChange={(e) => campo('natureza', e.target.value === 'fixo' ? 'fixo' : 'variavel')} className={entrada}>
            <option value="fixo">Fixo</option><option value="variavel">Variável</option>
          </select>
        </label>
      )}
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" checked={c.status === 'pendente'} onChange={(e) => campo('status', e.target.checked ? 'pendente' : 'pago')} className="size-5" />
        Ainda não foi pago
      </label>
      <label className="grid gap-1 text-sm">Observação
        <input value={c.observacao} onChange={(e) => campo('observacao', e.target.value)} className={entrada} />
      </label>
      {lancamento.transferenciaId && <p className="text-xs text-suave">Transferência: valor, data e situação mudam nas duas contas.</p>}
      {erro && <p role="alert" className="text-sm text-negativo">{erro}</p>}
    </FormRapido>
  )
}
