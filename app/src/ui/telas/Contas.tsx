
import { useRef, useState } from 'react'
import { Moldura } from '../componentes/Moldura'
import { FormRapido } from '../componentes/FormRapido'
import { CampoValor } from '../componentes/CampoValor'
import { comSinal, filtrarTaxa, fracaoDeTaxa, textoDeTaxa } from '../valores'
import { useDados } from '../hooks/useDados'
import { repo, novoId } from '../../data/repo'
import { db } from '../../data/db'
import { criarAjuste, criarTransferencia, saldoReserva, situacaoContas } from '../../domain/contas'
import { centavosDeDigitos, formatarBRL } from '../../domain/dinheiro'
import { saldoContas } from '../../domain/fluxo'
import { somenteDigitos } from '../validacao'
import { salvarPrefs } from '../hooks/usePreferencias'
import { hojeLocal, mesDe } from '../../domain/meses'
import type { Conta } from '../../domain/tipos'

export default function Contas() {
  const d = useDados()
  const mesAtual = mesDe(hojeLocal())
  const situacao = new Map(situacaoContas(d.contas, d.lancamentos, mesAtual).map((s) => [s.contaId, s]))
  const reserva = saldoReserva(d.contas, d.lancamentos) // só `usandoTodas` interessa aqui
  // Saldo de HOJE da conta (pagos com data <= hoje): é o que se confere com o banco; o cartão mostra o do fim do mês.
  const saldoHoje = (c: Conta) => saldoContas([c], d.lancamentos.filter((l) => l.contaId === c.id), hojeLocal())

  // cadastro/edição
  const [edit, setEdit] = useState<Conta | null>(null)
  const [saldo, setSaldo] = useState('')
  const [neg, setNeg] = useState(false)
  const [limite, setLimite] = useState('') // dígitos = centavos; vazio = sem limite
  const [taxa, setTaxa] = useState('') // % ao mês (ex. "8"); vazio = sem taxa
  // conferir saldo e transferir
  const [conferir, setConferir] = useState<Conta | null>(null)
  const [real, setReal] = useState('')
  const [negReal, setNegReal] = useState(false)
  const [transf, setTransf] = useState<Conta | null>(null)
  const [destinoId, setDestinoId] = useState('')
  const [valorTr, setValorTr] = useState('')
  const [descTr, setDescTr] = useState('')
  const ocupado = useRef(false) // trava de duplo toque nas gravações de ajuste/transferência

  const abrir = (c: Conta) => {
    setEdit(c)
    setSaldo(String(Math.abs(c.saldoInicial))); setNeg(c.saldoInicial < 0)
    setLimite(c.limiteChequeEspecial === undefined ? '' : String(c.limiteChequeEspecial))
    setTaxa(c.taxaChequeEspecial === undefined ? '' : textoDeTaxa(c.taxaChequeEspecial)) // até 4 casas de percent
  }
  const novo = () => abrir({ id: novoId(), nome: '', tipo: 'banco', saldoInicial: 0 })

  async function salvar() {
    if (!edit || !edit.nome.trim()) return
    // `taxa` guarda o percent com até 4 casas (vírgula ou ponto); a fração gravada mantém essa precisão.
    const taxaNum = fracaoDeTaxa(taxa)
    if (taxaNum !== undefined && !Number.isFinite(taxaNum)) { alert('Taxa do cheque especial inválida.'); return }
    const lim = centavosDeDigitos(limite)
    // Opcionais entram só quando preenchidos (nunca null/undefined gravado à força).
    const { limiteChequeEspecial: _l, taxaChequeEspecial: _t, reserva: _r, ...base } = edit
    await repo.contas.salvar({
      ...base, nome: edit.nome.trim(), saldoInicial: comSinal(saldo, neg),
      ...(lim > 0 ? { limiteChequeEspecial: lim } : {}),
      ...(taxaNum !== undefined ? { taxaChequeEspecial: taxaNum } : {}),
      ...(edit.reserva ? { reserva: true } : {}),
    })
    setEdit(null)
  }

  async function remover(c: Conta) {
    if (d.lancamentos.some((l) => l.contaId === c.id)) { alert('Esta conta tem lançamentos (inclusive transferências e ajustes). Mova ou exclua-os antes.'); return }
    if (confirm(`Remover ${c.nome}?`)) await repo.contas.remover(c.id)
  }

  // Conferir saldo: o saldo do app é o de `situacaoContas` (o mesmo exibido no cartão); a diferença vira um ajuste.
  async function salvarConferencia() {
    if (!conferir || ocupado.current) return
    const ajuste = criarAjuste({ id: novoId(), contaId: conferir.id, saldoApp: saldoHoje(conferir), saldoReal: comSinal(real, negReal), data: hojeLocal() })
    if (!ajuste) { alert('O saldo já confere.'); setConferir(null); return }
    ocupado.current = true
    try { await repo.lancamentos.salvar(ajuste); setConferir(null) } finally { ocupado.current = false }
  }

  async function salvarTransferencia() {
    if (!transf || ocupado.current) return
    ocupado.current = true
    try {
      const par = criarTransferencia({
        id: novoId(), contaOrigemId: transf.id, contaDestinoId: destinoId, valor: centavosDeDigitos(valorTr), data: hojeLocal(),
        ...(descTr.trim() ? { descricao: descTr.trim() } : {}),
      })
      await db.transaction('rw', db.lancamentos, () => db.lancamentos.bulkPut(par)) // saída e entrada juntas, numa transação
      setTransf(null)
    } catch (e) { alert((e as Error).message) } finally { ocupado.current = false } // mesma conta ou valor zero
  }

  return (
    <div className="grid gap-4">
      {reserva.usandoTodas && d.contas.length > 0 && (
        <p className="px-1 text-sm text-suave">Nenhuma conta marcada como reserva: a reserva usa todas as contas. Edite uma conta e marque "Esta é minha reserva".</p>
      )}
      {d.contas.map((c) => {
        const s = situacao.get(c.id)
        return (
          <Moldura key={c.id}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{c.nome}</div>
                <div className="text-xs text-suave">{c.tipo}{c.reserva ? ' · reserva' : ''}</div>
              </div>
              <div className={`valor text-lg ${s?.negativa ? 'text-negativo' : ''}`}>{formatarBRL(s?.saldo ?? 0)}</div>
            </div>
            {s?.negativa && (
              <p role="status" className="mt-2 rounded-xl bg-[var(--casca)] px-3 py-2 text-sm text-negativo">
                Conta negativa{s.jurosEstimadoMes > 0 ? ` · juro estimado de ${formatarBRL(s.jurosEstimadoMes)} no mês` : ''}
              </p>
            )}
            {s?.ficaraNegativa && (
              <p role="status" className="aviso mt-2 text-sm">
                Vai ficar negativa até o fim do mês (previsto {formatarBRL(s.previsto)})
              </p>
            )}
            {s?.limiteDisponivel !== undefined && (
              <p className="mt-2 text-sm text-suave">
                Limite disponível: <span className={`valor ${s.limiteDisponivel < 0 ? 'text-negativo' : ''}`}>{formatarBRL(s.limiteDisponivel)}</span>
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
              <button className="min-h-11 px-3 text-marca-texto" onClick={() => abrir(c)}>Editar</button>
              <button className="min-h-11 px-3 text-marca-texto" onClick={() => { setConferir(c); setReal(''); setNegReal(false) }}>Conferir saldo</button>
              {d.contas.length > 1 && (
                <button className="min-h-11 px-3 text-marca-texto"
                  onClick={() => { setTransf(c); setDestinoId(d.contas.find((x) => x.id !== c.id)?.id ?? ''); setValorTr(''); setDescTr('') }}>
                  Transferir
                </button>
              )}
              <button className="min-h-11 px-3 text-negativo" onClick={() => remover(c)}>Remover</button>
            </div>
          </Moldura>
        )
      })}
      <button onClick={novo} className="min-h-12 rounded-full bg-marca font-semibold text-white">Adicionar conta</button>

      {edit && (
        <FormRapido titulo="Conta" onSalvar={salvar} onCancelar={() => setEdit(null)}>
          <label className="grid gap-1 text-sm">Nome<input value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} className="min-h-11 rounded-xl bg-[var(--casca)] px-3" /></label>
          <label className="grid gap-1 text-sm">Tipo
            <select value={edit.tipo} onChange={(e) => setEdit({ ...edit, tipo: e.target.value as Conta['tipo'] })} className="min-h-11 rounded-xl bg-[var(--casca)] px-3">
              <option value="banco">Banco</option><option value="caixa">Caixa</option><option value="carteira">Carteira</option>
            </select>
          </label>
          <CampoValor rotulo="Saldo inicial" digitos={saldo} onDigitos={setSaldo} negativo={neg} onNegativo={setNeg} />
          <label className="grid gap-1 text-sm">Limite do cheque especial (opcional)
            <input inputMode="numeric" value={limite} onChange={(e) => setLimite(somenteDigitos(e.target.value))} className="valor min-h-11 rounded-xl bg-[var(--casca)] px-3" />
            <span className="text-suave">{formatarBRL(centavosDeDigitos(limite))}</span>
          </label>
          <label className="grid gap-1 text-sm">Taxa do cheque especial, % ao mês (opcional)
            <input inputMode="decimal" value={taxa} onChange={(e) => setTaxa(filtrarTaxa(e.target.value))} placeholder="ex.: 8" className="valor min-h-11 rounded-xl bg-[var(--casca)] px-3" />
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" className="size-5" checked={edit.reserva === true} onChange={(e) => setEdit({ ...edit, reserva: e.target.checked })} />
            Esta é minha reserva
          </label>
        </FormRapido>
      )}

      {conferir && (
        <FormRapido titulo={`Conferir saldo · ${conferir.nome}`} onSalvar={salvarConferencia} onCancelar={() => setConferir(null)}>
          <p className="text-sm text-suave">Saldo no app hoje: <span className="valor">{formatarBRL(saldoHoje(conferir))}</span></p>
          <CampoValor rotulo="Saldo real no banco" digitos={real} onDigitos={setReal} negativo={negReal} onNegativo={setNegReal} />
          <p className="text-sm">Diferença: <span className="valor">{formatarBRL(comSinal(real, negReal) - saldoHoje(conferir))}</span>. Salvar lança um ajuste de saldo para igualar.</p>
        </FormRapido>
      )}

      {transf && (
        <FormRapido titulo={`Transferir de ${transf.nome}`} onSalvar={salvarTransferencia} onCancelar={() => setTransf(null)}>
          <label className="grid gap-1 text-sm">Para a conta
            <select value={destinoId} onChange={(e) => { setDestinoId(e.target.value); salvarPrefs({ contaPadraoId: e.target.value }) }} className="min-h-11 rounded-xl bg-[var(--casca)] px-3">
              {d.contas.filter((x) => x.id !== transf.id).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm">Valor
            <input inputMode="numeric" value={valorTr} onChange={(e) => setValorTr(somenteDigitos(e.target.value))} className="valor min-h-11 rounded-xl bg-[var(--casca)] px-3" />
            <span className="text-suave">{formatarBRL(centavosDeDigitos(valorTr))}</span>
          </label>
          <label className="grid gap-1 text-sm">Descrição (opcional)<input value={descTr} onChange={(e) => setDescTr(e.target.value)} className="min-h-11 rounded-xl bg-[var(--casca)] px-3" /></label>
          <p className="text-xs text-suave">Transferência e ajuste mexem só no saldo das contas; nunca entram em receita, despesa ou sobra.</p>
        </FormRapido>
      )}
    </div>
  )
}
