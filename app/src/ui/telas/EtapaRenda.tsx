import { useRef, useState } from 'react'
import { Moldura } from '../componentes/Moldura'
import { novoId } from '../../data/repo'
import { db } from '../../data/db'
import { centavosDeDigitos, formatarBRL } from '../../domain/dinheiro'
import { somenteDigitos } from '../validacao'
import type { TipoFonte } from '../../domain/tipos'

const OPCOES: { tipo: TipoFonte; nome: string; exemplo: string }[] = [
  { tipo: 'fixa', nome: 'Salário fixo', exemplo: 'Recebo o mesmo valor todo mês' },
  { tipo: 'variavel', nome: 'Vendas / negócio próprio', exemplo: 'Muda de mês para mês' },
  { tipo: 'eventual', nome: 'Bicos e extras', exemplo: 'Aparece de vez em quando' },
]

export function EtapaRenda() {
  const [sel, setSel] = useState<Record<string, string>>({})
  const [saldo, setSaldo] = useState('')
  const [salvando, setSalvando] = useState(false)
  // Ids gerados uma vez por assistente: uma nova tentativa sobrescreve as mesmas linhas, nunca duplica.
  const ids = useRef<Record<string, string>>({ conta: novoId(), fixa: novoId(), variavel: novoId(), eventual: novoId() })

  async function concluir() {
    if (salvando) return
    setSalvando(true)
    try {
      // Uma transação: ou grava fontes e conta juntas, ou nada.
      await db.transaction('rw', db.fontes, db.contas, async () => {
        for (const o of OPCOES.filter((o) => sel[o.tipo] !== undefined))
          await db.fontes.put({ id: ids.current[o.tipo], nome: o.nome, tipo: o.tipo, valorEsperado: centavosDeDigitos(sel[o.tipo]) })
        await db.contas.put({ id: ids.current.conta, nome: 'Conta principal', tipo: 'banco', saldoInicial: centavosDeDigitos(saldo) })
      })
    } catch (e) {
      setSalvando(false)
      alert((e as Error).message)
    }
  }

  return (
    <div className="grid gap-5 pt-4">
      <h1 className="text-2xl font-extrabold">De onde vem o seu dinheiro?</h1>
      <p className="text-suave">Marque tudo o que se aplica. O app ajusta orçamento e reserva ao seu tipo de renda.</p>
      {OPCOES.map((o) => {
        const ativo = sel[o.tipo] !== undefined
        return (
          <Moldura key={o.tipo}>
            <label className="flex min-h-11 items-center gap-3">
              <input type="checkbox" className="size-5" checked={ativo}
                onChange={(e) => setSel((s) => { const n = { ...s }; if (e.target.checked) n[o.tipo] = ''; else delete n[o.tipo]; return n })} />
              <span><span className="block font-semibold">{o.nome}</span><span className="text-sm text-suave">{o.exemplo}</span></span>
            </label>
            {ativo && (
              <label className="mt-3 grid gap-1 text-sm">Quanto você espera por mês?
                <input inputMode="numeric" value={sel[o.tipo]} placeholder="0"
                  onChange={(e) => setSel((s) => ({ ...s, [o.tipo]: somenteDigitos(e.target.value) }))}
                  className="valor min-h-11 rounded-xl bg-[var(--casca)] px-3" />
                <span className="text-suave">{formatarBRL(centavosDeDigitos(sel[o.tipo]))}</span>
              </label>
            )}
          </Moldura>
        )
      })}
      <Moldura>
        <label className="grid gap-1 text-sm">Quanto você tem hoje em conta e carteira?
          <input inputMode="numeric" value={saldo} onChange={(e) => setSaldo(somenteDigitos(e.target.value))}
            className="valor min-h-11 rounded-xl bg-[var(--casca)] px-3" placeholder="0" />
          <span className="text-suave">{formatarBRL(centavosDeDigitos(saldo))}</span>
        </label>
      </Moldura>
      <button disabled={Object.keys(sel).length === 0 || salvando} onClick={concluir}
        className="min-h-12 rounded-full bg-marca px-6 font-semibold text-white disabled:opacity-40">
        Começar
      </button>
    </div>
  )
}
