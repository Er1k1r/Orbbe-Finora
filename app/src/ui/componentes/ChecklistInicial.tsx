import { Link } from 'react-router-dom'
import { CheckCircle, Circle } from '@phosphor-icons/react'
import { Moldura } from './Moldura'
import { useDados } from '../hooks/useDados'
import { ehMovimentoInterno } from '../../domain/fluxo'
import { salvarPrefs, usePrefs } from '../hooks/usePreferencias'

export function ChecklistInicial({ abrirLancamento }: { abrirLancamento: () => void }) {
  const d = useDados()
  const prefs = usePrefs()
  const passos = [
    { id: 'conta', rotulo: 'Criar conta bancária', feito: d.contas.length > 0, para: '/contas', acao: 'Adicionar conta' },
    { id: 'gasto', rotulo: 'Registrar o primeiro gasto', feito: d.lancamentos.some((l) => l.tipo === 'saida' && !ehMovimentoInterno(l)), para: undefined, acao: 'Registrar gasto' },
    { id: 'renda', rotulo: 'Cadastrar sua renda', feito: d.fontes.length > 0, para: '/fontes', acao: 'Cadastrar renda' },
    { id: 'divida', rotulo: 'Cadastrar um financiamento', feito: d.financiamentos.length > 0 || prefs.semFinanciamento, para: '/dividas', acao: 'Adicionar financiamento' },
  ]
  const feitos = passos.filter((p) => p.feito).length
  if (prefs.checklistFechado || feitos === passos.length) return null
  const proximo = passos.find((p) => !p.feito)!

  return (
    <Moldura>
      <h3 className="text-lg font-semibold">Vamos começar</h3>
      <div className="mt-3 grid grid-cols-4 gap-1.5" role="progressbar" aria-label="Passos concluídos"
        aria-valuenow={feitos} aria-valuemin={0} aria-valuemax={4}>
        {passos.map((p) => <div key={p.id} className={`h-1.5 rounded-full ${p.feito ? 'bg-marca' : 'bg-[var(--linha)]'}`} />)}
      </div>
      <p className="mt-1 text-sm text-suave">{feitos} de 4 concluídos</p>
      <ul className="mt-3">
        {passos.map((p) => (
          <li key={p.id} className="flex min-h-11 items-center gap-3">
            {p.feito ? <CheckCircle size={22} weight="fill" className="text-marca-texto" /> : <Circle size={22} weight="light" />}
            <span className={p.feito ? 'text-suave line-through' : 'font-semibold'}>{p.rotulo}</span>
            <span className="sr-only">{p.feito ? ' (concluído)' : ' (pendente)'}</span>
          </li>
        ))}
      </ul>
      {proximo.para ? (
        <Link to={proximo.para} className="mt-3 grid min-h-12 place-items-center rounded-full bg-marca font-semibold text-white">{proximo.acao}</Link>
      ) : (
        <button onClick={abrirLancamento} className="mt-3 min-h-12 w-full rounded-full bg-marca font-semibold text-white">{proximo.acao}</button>
      )}
      {proximo.id === 'divida' && (
        <button onClick={() => salvarPrefs({ semFinanciamento: true })} className="mt-1 min-h-11 w-full text-sm text-suave">Não tenho financiamento</button>
      )}
      <button onClick={() => salvarPrefs({ checklistFechado: true })} className="min-h-11 w-full text-sm text-suave">Dispensar</button>
    </Moldura>
  )
}
