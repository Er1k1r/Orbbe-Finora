import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Moldura } from '../componentes/Moldura'
import { FormRapido } from '../componentes/FormRapido'
import { useDados } from '../hooks/useDados'
import { analisarCarne, type CamposCarne } from '../contratoForm'
import { somenteDigitos } from '../validacao'
import { filtrarTaxa } from '../valores'
import { desvincularContrato } from '../construtores'
import { repo, novoId } from '../../data/repo'
import { db } from '../../data/db'
import { estadoFinanciamento, parcelaDoMes } from '../../domain/fluxo'
import { parcelasAtrasadas } from '../../domain/contrato'
import { formatarBRL, formatarPct } from '../../domain/dinheiro'
import { fimDoMes, hojeLocal, mesDe } from '../../domain/meses'
import { TIPOS_BEM, type Financiamento, type Mes, type TipoBem } from '../../domain/tipos'

const ROTULO_BEM: Record<TipoBem, string> = { carro: 'Carro', moto: 'Moto', casa: 'Casa', outro: 'Outro' }

const vazio = (): CamposCarne => ({ nome: '', valorFin: '', valorParc: '', total: '', pagas: '', primeira: hojeLocal(), sistema: 'SAC', taxaTexto: '' })

export default function Dividas({ mes }: { mes: Mes }) {
  const d = useDados()
  const [edit, setEdit] = useState<{ id: string; campos: CamposCarne; tipo: TipoBem } | null>(null)
  const [erros, setErros] = useState<string[]>([])
  const ocupado = useRef(false)
  const futuro = mes > mesDe(hojeLocal())

  const abrir = (f?: Financiamento) => {
    setErros([])
    setEdit(f
      ? { id: f.id, campos: {
          nome: f.nome, valorFin: String(f.valorFinanciado), valorParc: String(f.valorParcela), total: String(f.totalParcelas),
          pagas: String(f.parcelasPagasAntes), primeira: f.primeiraParcela, sistema: f.sistema, taxaTexto: '',
        }, tipo: f.tipo ?? 'outro' }
      : { id: novoId(), campos: vazio(), tipo: 'outro' })
  }
  const campo = <K extends keyof CamposCarne>(k: K, v: CamposCarne[K]) => setEdit((e) => (e ? { ...e, campos: { ...e.campos, [k]: v } } : e))

  const analise = edit ? analisarCarne(edit.campos) : null

  async function salvar() {
    if (!edit || !analise || ocupado.current) return
    if (analise.erros.length > 0) { setErros(analise.erros); return }
    ocupado.current = true
    try {
      await repo.financiamentos.salvar({ ...analise.contrato, id: edit.id, nome: edit.campos.nome.trim(), tipo: edit.tipo })
      setEdit(null)
    } finally { ocupado.current = false }
  }

  async function remover(f: Financiamento) {
    if (!confirm(`Remover ${f.nome}? Os planos de amortização e as parcelas pendentes serão excluídos. Os pagamentos já feitos ficam como despesas comuns (saídas sem vínculo com o contrato).`)) return
    await db.transaction('rw', db.financiamentos, db.planos, db.lancamentos, async () => {
      await db.financiamentos.delete(f.id)
      await db.planos.where('financiamentoId').equals(f.id).delete()
      const { excluirIds, reescrever } = desvincularContrato(f.id, d.lancamentos)
      for (const id of excluirIds) await db.lancamentos.delete(id)
      for (const l of reescrever) await db.lancamentos.put(l)
    })
  }

  const entrada = 'min-h-11 rounded-xl bg-[var(--casca)] px-3'

  return (
    <div className="grid gap-4">
      {d.financiamentos.length === 0 && <p className="px-1 text-sm text-suave">Nenhuma dívida cadastrada. Use os dados do carnê de pagamento.</p>}
      {d.financiamentos.map((f) => {
        const estado = estadoFinanciamento(f, d.lancamentos, fimDoMes(mes))
        const atraso = parcelasAtrasadas(estado, mes)
        return (
          <Moldura key={f.id}>
            <Link to={`/dividas/${f.id}`} className="block min-h-11">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{f.nome}</div>
                  <div className="text-xs text-suave">{estado.parcelasPagas}/{f.totalParcelas} pagas · {f.sistema} · {formatarPct(f.taxaMensal)} a.m.</div>
                </div>
                <div className="text-right">
                  <div className="valor text-lg text-divida">{formatarBRL(estado.saldoDevedor)}</div>
                  <div className="text-xs text-suave">saldo devedor</div>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-suave">Parcela do mês <span className="valor text-divida">{formatarBRL(parcelaDoMes(f, mes, d.lancamentos))}</span></span>
                {atraso > 0 && <span className="chip-pendente text-xs font-semibold">{futuro ? 'A pagar' : 'Atrasadas'}: {formatarBRL(atraso)}</span>}
              </div>
            </Link>
            <div className="mt-2 flex gap-2 text-sm font-semibold">
              <button className="min-h-11 px-3 text-marca-texto" onClick={() => abrir(f)}>Editar</button>
              <button className="min-h-11 px-3 text-negativo" onClick={() => remover(f)}>Remover</button>
            </div>
          </Moldura>
        )
      })}
      <button onClick={() => abrir()} className="min-h-12 rounded-full bg-marca font-semibold text-white">Adicionar dívida</button>

      {edit && analise && (
        <FormRapido titulo="Dívida" onSalvar={salvar} onCancelar={() => setEdit(null)}>
          <label className="grid gap-1 text-sm">Nome
            <input value={edit.campos.nome} onChange={(e) => campo('nome', e.target.value)} className={entrada} />
          </label>
          <label className="grid gap-1 text-sm">O que foi financiado
            <select value={edit.tipo} onChange={(e) => setEdit((x) => (x ? { ...x, tipo: TIPOS_BEM.find((t) => t === e.target.value) ?? 'outro' } : x))} className={entrada}>
              {TIPOS_BEM.map((t) => <option key={t} value={t}>{ROTULO_BEM[t]}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm">Valor financiado
            <input inputMode="numeric" value={edit.campos.valorFin} onChange={(e) => campo('valorFin', somenteDigitos(e.target.value))} className={`valor ${entrada}`} />
            <span className="text-suave">{formatarBRL(analise.contrato.valorFinanciado)}</span>
          </label>
          <label className="grid gap-1 text-sm">Valor da parcela (Price: fixa; SAC: a 1ª)
            <input inputMode="numeric" value={edit.campos.valorParc} onChange={(e) => campo('valorParc', somenteDigitos(e.target.value))} className={`valor ${entrada}`} />
            <span className="text-suave">{formatarBRL(analise.contrato.valorParcela)}</span>
          </label>
          <label className="grid gap-1 text-sm">Número de parcelas
            <input inputMode="numeric" value={edit.campos.total} onChange={(e) => campo('total', somenteDigitos(e.target.value))} className={`valor ${entrada}`} />
          </label>
          <label className="grid gap-1 text-sm">Data da 1ª parcela
            <input type="date" value={edit.campos.primeira} onChange={(e) => campo('primeira', e.target.value)} className={entrada} />
          </label>
          <label className="grid gap-1 text-sm">Sistema
            <select value={edit.campos.sistema} onChange={(e) => campo('sistema', e.target.value === 'PRICE' ? 'PRICE' : 'SAC')} className={entrada}>
              <option value="SAC">SAC</option><option value="PRICE">Price</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">Parcelas já pagas antes do app
            <input inputMode="numeric" value={edit.campos.pagas} onChange={(e) => campo('pagas', somenteDigitos(e.target.value))} placeholder="0" className={`valor ${entrada}`} />
          </label>
          <label className="grid gap-1 text-sm">Taxa que você acha que é, % ao mês (opcional)
            <input inputMode="decimal" value={edit.campos.taxaTexto} onChange={(e) => campo('taxaTexto', filtrarTaxa(e.target.value))} placeholder="ex.: 1,5" className={`valor ${entrada}`} />
          </label>
          {analise.implicita !== null && <p className="text-sm">Taxa do carnê: <span className="valor">{formatarPct(analise.implicita)}</span> a.m.</p>}
          {analise.taxaDifere && analise.informada !== undefined && (
            <p role="alert" className="aviso text-sm">A taxa que você informou ({formatarPct(analise.informada)}) não bate com o carnê; o app usa a do carnê.</p>
          )}
          {erros.length > 0 && (
            <ul role="alert" className="grid gap-1 text-sm text-negativo">{erros.map((e) => <li key={e}>{e}</li>)}</ul>
          )}
        </FormRapido>
      )}
    </div>
  )
}
