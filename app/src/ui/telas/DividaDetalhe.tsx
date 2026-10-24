import { useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Moldura } from '../componentes/Moldura'
import { FormPagamento } from './FormPagamento'
import { useResumo } from '../hooks/useResumo'
import { repo, novoId } from '../../data/repo'
import { simularAporte, type resumirCronograma } from '../../domain/amortizacao'
import { somenteDigitos } from '../validacao'
import { antecipacaoUltimas } from '../../domain/contrato'
import { centavosDeDigitos, formatarBRL, formatarNumero, formatarPct } from '../../domain/dinheiro'
import { estadoFinanciamento } from '../../domain/fluxo'
import type { EfeitoAporte, Mes } from '../../domain/tipos'

const Linha = ({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) => (
  <div className="flex items-baseline justify-between py-1.5"><span className="text-suave">{rotulo}</span><span className={`valor ${cor ?? ''}`}>{valor}</span></div>
)
const Col = ({ titulo, r }: { titulo: string; r: ReturnType<typeof resumirCronograma> }) => (
  <div className="grid gap-2 text-sm">
    <div className="text-[10px] uppercase tracking-[0.2em] text-suave">{titulo}</div>
    <div><div className="text-suave">Prazo</div><div className="valor">{r.prazo} meses</div></div>
    <div><div className="text-suave">1ª parcela</div><div className="valor">{formatarBRL(r.primeiraParcela)}</div></div>
    <div><div className="text-suave">Juros totais</div><div className="valor">{formatarBRL(r.jurosTotais)}</div></div>
  </div>
)

export default function DividaDetalhe({ mes }: { mes: Mes }) {
  const { id } = useParams()
  const { financiamentos, planos, lancamentos, resumo } = useResumo(mes)
  const f = financiamentos.find((x) => x.id === id)
  const plano = planos.find((p) => p.financiamentoId === id)
  const [digitos, setDigitos] = useState(plano ? String(plano.aporteExtraMensal) : '')
  const [efeito, setEfeito] = useState<EfeitoAporte>(plano?.efeito ?? 'reduzir_prazo')
  const [nTexto, setNTexto] = useState('') // "antecipar as últimas N"
  const [pagando, setPagando] = useState<'parcela' | 'antecipacao' | null>(null)
  const [salvo, setSalvo] = useState(false)
  const ocupado = useRef(false)
  const aporte = centavosDeDigitos(digitos)
  // A sobra otimizada já desconta o plano de TODAS as dívidas; devolve só o plano desta, que será substituído.
  const sobraLivre = Math.max(0, resumo.sobraOtimizada + (plano?.aporteExtraMensal ?? 0))

  const estado = useMemo(() => (f ? estadoFinanciamento(f, lancamentos) : undefined), [f, lancamentos])
  // O simulador parte do estado atual: saldo devedor e parcelas restantes, com a parcela fixa do contrato.
  const sim = useMemo(
    () => f && estado && estado.restantes.length > 0
      ? simularAporte({
          saldo: estado.saldoDevedor, taxa: f.taxaMensal, prazo: estado.restantes.length, sistema: f.sistema, aporte, efeito,
          parcelaFixa: f.sistema === 'PRICE' ? f.valorParcela : undefined,
          amortizacaoFixa: f.sistema === 'SAC' ? Math.round(f.valorFinanciado / f.totalParcelas) : undefined,
        })
      : undefined,
    [f, estado, aporte, efeito],
  )
  if (!f || !estado) return <p>Financiamento não encontrado.</p>

  const proxima = estado.restantes[0] // parcela do contrato que o próximo "Pagar parcela" consome
  const n = Number(nTexto)
  const nValido = Number.isInteger(n) && n >= 1 && n <= estado.restantes.length
  const ant = nValido ? antecipacaoUltimas(estado, f.taxaMensal, n) : null
  const pagoContrato = estado.pagas.reduce((s, p) => s + p.parcela, 0) + estado.antecipado

  async function salvarPlano() {
    if (!f || ocupado.current) return
    ocupado.current = true
    try {
      for (const p of planos.filter((p) => p.financiamentoId === f.id)) await repo.planos.remover(p.id)
      if (aporte > 0) await repo.planos.salvar({ id: novoId(), financiamentoId: f.id, aporteExtraMensal: aporte, efeito })
      setSalvo(true)
    } finally { ocupado.current = false }
  }

  return (
    <div className="grid gap-5">
      <Moldura>
        <h2 className="text-xl font-semibold">{f.nome}</h2>
        <p className="text-suave">{formatarPct(f.taxaMensal)} a.m. (calculada do carnê) · {f.sistema}</p>
        <div className="mt-3 divide-y divide-[var(--linha)] text-sm">
          <Linha rotulo="Total do contrato" valor={formatarBRL(estado.totalContrato)} />
          <Linha rotulo={`Já pago (${estado.parcelasPagas}/${f.totalParcelas})`} valor={formatarBRL(pagoContrato)} />
          <Linha rotulo="Juros pagos" valor={formatarBRL(estado.jurosPagos)} />
          <Linha rotulo="Juros a pagar" valor={formatarBRL(estado.jurosAPagar)} />
          <Linha rotulo="Saldo devedor" valor={formatarBRL(estado.saldoDevedor)} cor="text-divida" />
          <Linha rotulo="Quitar hoje" valor={formatarBRL(estado.saldoDevedor)} />
          <Linha rotulo="Desconto por quitar" valor={`− ${formatarBRL(estado.descontoQuitacao)}`} cor="text-positivo" />
        </div>
        <p className="mt-2 text-xs text-suave">Valores estimados: o banco pode somar IOF, seguro e tarifas na quitação ou antecipação.</p>
        {proxima ? (
          <button onClick={() => setPagando('parcela')} className="mt-3 min-h-12 w-full rounded-full bg-marca font-semibold text-white">
            Pagar parcela {proxima.numero} · {formatarBRL(proxima.parcela)}
          </button>
        ) : <p className="mt-3 font-semibold text-positivo">Contrato quitado.</p>}
      </Moldura>

      {estado.restantes.length > 0 && (
        <Moldura>
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-suave">Antecipar as últimas parcelas</h3>
          <label className="mt-2 grid gap-1 text-sm">Quantas parcelas (de {formatarNumero(estado.restantes.length, 0)} restantes)?
            <input inputMode="numeric" value={nTexto} onChange={(e) => setNTexto(somenteDigitos(e.target.value))}
              className="valor min-h-11 rounded-xl bg-[var(--casca)] px-3" placeholder="1" />
          </label>
          {nTexto !== '' && !nValido && (
            <p role="alert" className="mt-2 text-sm text-negativo">Informe um número inteiro de 1 até {estado.restantes.length}.</p>
          )}
          {ant && (
            <div className="mt-3 text-sm">
              <Linha rotulo="Valor a pagar hoje" valor={formatarBRL(ant.valor)} />
              <Linha rotulo="Soma nominal das parcelas" valor={formatarBRL(ant.nominal)} />
              <Linha rotulo="Desconto" valor={`− ${formatarBRL(ant.desconto)}`} cor="text-positivo" />
              <p className="mt-1 text-xs text-suave">Estimativa: o valor final pode variar com IOF, seguro e tarifas.</p>
              <button onClick={() => setPagando('antecipacao')} className="mt-2 min-h-11 text-sm font-semibold text-marca-texto">Registrar antecipação</button>
            </div>
          )}
        </Moldura>
      )}

      {sim && (
        <>
          <Moldura>
            <label className="grid gap-1 text-sm">Aporte extra por mês
              <input inputMode="numeric" value={digitos} onChange={(e) => { setDigitos(somenteDigitos(e.target.value)); setSalvo(false) }}
                className="valor min-h-11 rounded-xl bg-[var(--casca)] px-3" placeholder="0" />
              <span className="text-suave">{formatarBRL(aporte)}</span>
            </label>
            <button type="button" disabled={sobraLivre <= 0} onClick={() => { setDigitos(String(sobraLivre)); setSalvo(false) }}
              className="mt-2 min-h-11 text-sm font-semibold text-marca-texto disabled:opacity-40">
              Usar sobra do mês ({formatarBRL(sobraLivre)})
            </button>
            <div role="radiogroup" aria-label="Efeito do aporte" className="mt-3 grid grid-cols-2 rounded-full bg-[var(--casca)] p-1 text-sm">
              {(['reduzir_prazo', 'reduzir_parcela'] as const).map((e) => (
                <button key={e} type="button" role="radio" aria-checked={efeito === e} onClick={() => { setEfeito(e); setSalvo(false) }}
                  className={`min-h-11 rounded-full font-semibold ${efeito === e ? 'bg-[var(--superficie)]' : 'text-suave'}`}>
                  {e === 'reduzir_prazo' ? 'Reduzir prazo' : 'Reduzir parcela'}
                </button>
              ))}
            </div>
          </Moldura>
          <Moldura>
            <div className="grid grid-cols-2 gap-4">
              <Col titulo="Atual" r={sim.atual} />
              <Col titulo="Com aporte" r={sim.comAporte} />
            </div>
            <div className="mt-4 rounded-2xl bg-[var(--casca)] p-4">
              <div className="text-sm text-suave">Economia de juros</div>
              <div className="valor text-2xl text-positivo">+ {formatarBRL(sim.economiaJuros)}</div>
              <div className="text-sm text-suave">{sim.mesesEconomizados} meses a menos</div>
            </div>
            <button onClick={salvarPlano} className="mt-4 min-h-12 w-full rounded-full bg-marca font-semibold text-white">
              Salvar como plano
            </button>
            {salvo && <p role="status" className="mt-2 text-sm text-positivo">{aporte > 0 ? 'Plano salvo.' : 'Plano removido.'}</p>}
          </Moldura>
        </>
      )}

      {pagando === 'parcela' && proxima && (
        <FormPagamento f={f} tipo="parcela" valorInicial={proxima.parcela} parcelaContrato={proxima.parcela}
          descricao={`Parcela ${proxima.numero} · ${f.nome}`} fechar={() => setPagando(null)} />
      )}
      {pagando === 'antecipacao' && ant && (
        <FormPagamento f={f} tipo="antecipacao" valorInicial={ant.valor}
          descricao={`Antecipação · ${f.nome}`} fechar={() => setPagando(null)} />
      )}
    </div>
  )
}
