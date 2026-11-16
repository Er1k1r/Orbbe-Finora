import { useMemo } from 'react'
import { Moldura } from './Moldura'
import { useDados } from '../hooks/useDados'
import { eventosDoMes, semanaDe, type EventoDia } from '../../domain/folhinha'
import { formatarBRL } from '../../domain/dinheiro'
import { mesDe } from '../../domain/meses'

const DIA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const diaDaSemana = (data: string) => {
  const [a, m, d] = data.split('-').map(Number)
  return new Date(a, m - 1, d).getDay()
}

/** "Esta semana": o que entra e o que vence de domingo a sábado, com o dia em numeral de folhinha. */
export function ListaSemana({ hoje }: { hoje: string }) {
  const d = useDados()
  const itens = useMemo(() => {
    const nome = (id: string) => d.categorias.find((c) => c.id === id)?.nome ?? ''
    const dias = new Set(semanaDe(hoje))
    const meses = [...new Set([...dias].map(mesDe))]
    const todos: EventoDia[] = meses.flatMap((m) => eventosDoMes(d.lancamentos, d.financiamentos, m, hoje, nome))
    return todos.filter((e) => dias.has(e.data))
  }, [d.lancamentos, d.financiamentos, d.categorias, hoje])

  return (
    <Moldura>
      <h3 className="text-[19px] leading-tight">Esta semana</h3>
      {itens.length === 0 && <p className="mt-2 text-sm text-suave">Nada para pagar ou receber nesta semana.</p>}
      <ul className="mt-1">
        {itens.map((e) => {
          const domingo = diaDaSemana(e.data) === 0
          return (
            <li key={e.id} className="grid grid-cols-[2.75rem_1fr_auto] items-center gap-3 border-t border-[var(--linha)] py-2.5 first:border-t-0">
              <span className="text-center leading-none">
                <span className={`numeral block text-[28px] ${e.situacao === 'vencido' || domingo ? 'text-negativo' : ''}`}>{Number(e.data.slice(8))}</span>
                <span className="text-xs font-bold text-suave">{DIA[diaDaSemana(e.data)]}</span>
              </span>
              <span className="min-w-0">
                <span className={`block truncate font-semibold ${e.situacao === 'pago' ? 'text-suave line-through decoration-1' : ''}`}>{e.nome}</span>
                <span className="text-xs">
                  {e.situacao === 'vencido'
                    ? <span className="chip-vencido">{e.data === hoje ? 'vence hoje' : 'venceu'}</span>
                    : <span className="text-suave">{e.situacao === 'pago' ? (e.tipo === 'entrada' ? 'recebido' : 'pago') : e.origem === 'previsto' ? 'previsto' : e.data === hoje ? 'hoje' : e.tipo === 'entrada' ? 'a receber' : 'a pagar'}</span>}
                </span>
              </span>
              <span className={`valor ${e.tipo === 'entrada' ? 'text-positivo' : 'text-negativo'}`}>{e.tipo === 'entrada' ? '+' : '−'} {formatarBRL(e.valor)}</span>
            </li>
          )
        })}
      </ul>
    </Moldura>
  )
}
