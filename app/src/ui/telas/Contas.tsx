
import { useRef, useState } from 'react'
import { Moldura } from '../componentes/Moldura'
import { FormRapido } from '../componentes/FormRapido'
import { CampoValor } from '../componentes/CampoValor'
import { comSinal, filtrarTaxa, fracaoDeTaxa, textoDeTaxa } from '../valores'
import { useDados } from '../hooks/useDados'
import { repo, novoId } from '../../data/repo'
import { db } from '../../data/db'
import { saldoReserva, situacaoContas } from '../../domain/contas'
import { movimentoContas } from '../../domain/analise'
import { NOMES_MES } from '../rotulos'
import { centavosDeDigitos, formatarBRL } from '../../domain/dinheiro'
import { saldoContas } from '../../domain/fluxo'
import { somenteDigitos } from '../validacao'
import { rotuloTipoConta } from '../rotulos'
import { montarConferencia, montarConta, montarTransferencia } from '../construtores'
import { hojeLocal, mesDe } from '../../domain/meses'
import type { Conta } from '../../domain/tipos'

export default function Contas() {
  const d = useDados()
  const mesAtual = mesDe(hojeLocal())
  const situacao = new Map(situacaoContas(d.contas, d.lancamentos, mesAtual, d.financiamentos).map((s) => [s.contaId, s]))
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
    // Opcionais entram só quando preenchidos (nunca null/undefined gravado à força).
    await repo.contas.salvar(montarConta(edit, { saldoDigitos: saldo, negativo: neg, limiteDigitos: limite, taxa: taxaNum }))
    setEdit(null)
  }

  async function remover(c: Conta) {
    if (d.lancamentos.some((l) => l.contaId === c.id)) { alert('Esta conta tem lançamentos (inclusive transferências e ajustes). Mova ou exclua-os antes.'); return }
    if (confirm(`Remover ${c.nome}?`)) await repo.contas.remover(c.id)
  }

  // Conferir saldo: o saldo do app é o de `situacaoContas` (o mesmo exibido no cartão); a diferença vira um ajuste.
  async function salvarConferencia() {
    if (!conferir || ocupado.current) return
    const ajuste = montarConferencia({ id: novoId(), contaId: conferir.id, saldoApp: saldoHoje(conferir), realDigitos: real, negativo: negReal, data: hojeLocal() })
    if (!ajuste) { alert('O saldo já confere.'); setConferir(null); return }
    ocupado.current = true
    try { await repo.lancamentos.salvar(ajuste); setConferir(null) } finally { ocupado.current = false }
  }

  async function salvarTransferencia() {
    if (!transf || ocupado.current) return
    ocupado.current = true
    try {
      const par = montarTransferencia({ id: novoId(), origemId: transf.id, destinoId, valorDigitos: valorTr, data: hojeLocal(), descricao: descTr })
      await db.transaction('rw', db.lancamentos, () => db.lancamentos.bulkPut(par)) // saída e entrada juntas, numa transação
      setTransf(null)
    } catch (e) { alert((e as Error).message) } finally { ocupado.current = false } // mesma conta ou valor zero
  }

  const movimento = movimentoContas(d.contas, d.lancamentos, mesAtual, d.financiamentos)
  const total = movimento.reduce((t, m) => ({
    inicial: t.inicial + m.inicial, receitas: t.receitas + m.receitas, despesas: t.despesas + m.despesas,
    transfEntrada: t.transfEntrada + m.transfEntrada, transfSaida: t.transfSaida + m.transfSaida, saldo: t.saldo + m.saldo, previsto: t.previsto + m.previsto,
  }), { inicial: 0, receitas: 0, despesas: 0, transfEntrada: 0, transfSaida: 0, saldo: 0, previsto: 0 })
  const tom = (v: number) => (v < 0 ? 'text-negativo' : v > 0 ? 'text-positivo' : 'text-suave')
  const celula = 'valor whitespace-nowrap px-3 py-3 text-right'

  return (
    <div className="grid gap-5">
      {d.contas.length > 0 && (
        <Moldura className="!p-0 overflow-hidden">
          <h2 className="px-5 pt-4 text-[19px] leading-tight">Movimento de {NOMES_MES[Number(mesAtual.slice(5)) - 1].toLowerCase()}</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <thead>
                <tr className="text-xs text-suave">
                  <th className="px-5 py-2 text-left font-bold">Conta</th>
                  <th className="px-3 text-right font-bold">Saldo inicial</th><th className="px-3 text-right font-bold">Receitas</th>
                  <th className="px-3 text-right font-bold">Despesas</th><th className="px-3 text-right font-bold">Transf. recebidas</th>
                  <th className="px-3 text-right font-bold">Transf. enviadas</th><th className="px-3 text-right font-bold">Saldo</th>
                  <th className="px-5 text-right font-bold">Previsto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--linha)]">
                {movimento.map((m) => {
                  const c = d.contas.find((x) => x.id === m.contaId)!
                  return (
                    <tr key={m.contaId} className="transition-colors hover:bg-[var(--casa)]">
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-2 font-semibold">
                          <span aria-hidden className="grid size-8 place-items-center rounded-[10px] bg-[var(--azul)] text-sm font-extrabold text-white">{c.nome.slice(0, 1).toUpperCase()}</span>
                          {c.nome}{c.reserva && <span className="rounded-full border border-[var(--linha)] px-2 text-xs text-suave">reserva</span>}
                        </span>
                      </td>
                      <td className={`${celula} ${m.inicial < 0 ? 'text-negativo' : ''}`}>{formatarBRL(m.inicial)}</td>
                      <td className={`${celula} ${m.receitas ? 'text-positivo' : 'text-suave'}`}>{formatarBRL(m.receitas)}</td>
                      <td className={`${celula} ${m.despesas ? 'text-negativo' : 'text-suave'}`}>{formatarBRL(m.despesas)}</td>
                      <td className={`${celula} text-suave`}>{formatarBRL(m.transfEntrada)}</td>
                      <td className={`${celula} text-suave`}>{formatarBRL(m.transfSaida)}</td>
                      <td className={`${celula} text-base font-bold ${tom(m.saldo)}`}>{formatarBRL(m.saldo)}</td>
                      <td className={`${celula} pr-5 ${tom(m.previsto)}`}>{formatarBRL(m.previsto)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--linha)] font-bold">
                  <td className="px-5 py-3">Total</td>
                  <td className={celula}>{formatarBRL(total.inicial)}</td><td className={`${celula} text-positivo`}>{formatarBRL(total.receitas)}</td>
                  <td className={`${celula} text-negativo`}>{formatarBRL(total.despesas)}</td><td className={celula}>{formatarBRL(total.transfEntrada)}</td>
                  <td className={celula}>{formatarBRL(total.transfSaida)}</td><td className={`${celula} ${tom(total.saldo)}`}>{formatarBRL(total.saldo)}</td>
                  <td className={`${celula} pr-5 ${tom(total.previsto)}`}>{formatarBRL(total.previsto)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="px-5 pb-4 pt-1 text-xs text-suave">Só o que já foi pago neste mês. O previsto inclui os pendentes e as parcelas dos financiamentos ligados à conta.</p>
        </Moldura>
      )}
      {reserva.usandoTodas && d.contas.length > 0 && (
        <p className="px-1 text-sm text-suave">Nenhuma conta marcada como reserva: a reserva usa todas as contas. Edite uma conta e marque "Esta é minha reserva".</p>
      )}
      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
      {d.contas.map((c) => {
        const s = situacao.get(c.id)
        return (
          <Moldura key={c.id}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{c.nome}</div>
                <div className="text-xs text-suave">{rotuloTipoConta(c.tipo)}{c.reserva ? ' · reserva' : ''}</div>
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
      </div>
      <button onClick={novo} className="min-h-12 rounded-full bg-marca px-8 font-semibold text-white md:justify-self-start">Adicionar conta</button>

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
            <select value={destinoId} onChange={(e) => setDestinoId(e.target.value)} className="min-h-11 rounded-xl bg-[var(--casca)] px-3">
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
