import { Moldura } from '../componentes/Moldura'
import { useResumo } from '../hooks/useResumo'
import { formatarBRL } from '../../domain/dinheiro'
import { nomeCompromisso, rotuloMes } from '../rotulos'
import type { Mes } from '../../domain/tipos'

const ROTULO = { financiamentos: 'Financiamentos', parcelados: 'Compras parceladas', recorrencias: 'Recorrentes', outros: 'Outros pendentes' } as const

export default function Compromissos({ mes }: { mes: Mes }) {
  const { compromissos, categorias } = useResumo(mes)
  return (
    <div className="grid gap-4">
      {compromissos.meses.map((m) => (
        <Moldura key={m.mes}>
          <div className="flex items-baseline justify-between">
            <h3 className="font-semibold">{rotuloMes(m.mes)}</h3>
            <span className="valor text-lg text-divida">− {formatarBRL(m.total)}</span>
          </div>
          {(Object.keys(ROTULO) as (keyof typeof ROTULO)[]).filter((k) => m[k] > 0).map((k) => (
            <div key={k} className="mt-1 flex items-baseline justify-between text-sm"><span className="text-suave">{ROTULO[k]}</span><span className="valor">{formatarBRL(m[k])}</span></div>
          ))}
          <ul className="mt-3 divide-y divide-[var(--linha)] text-sm">
            {m.itens.map((i, k) => (
              // `descricao` pode ser o id da categoria (lançamento sem descrição): mostrar o NOME.
              <li key={k} className="flex justify-between py-2"><span>{nomeCompromisso(i.descricao, categorias)}</span><span className="valor">{formatarBRL(i.valor)}</span></li>
            ))}
          </ul>
        </Moldura>
      ))}
      <Moldura>
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-suave">Quando termina</h3>
        {compromissos.terminos.length === 0 && <p className="mt-2 text-suave">Nenhum compromisso com data de término.</p>}
        <ul className="mt-2 grid gap-2 text-sm">
          {compromissos.terminos.map((t) => (
            <li key={`${t.origem}-${t.descricao}-${t.mes}`}>{nomeCompromisso(t.descricao, categorias)} termina em {rotuloMes(t.mes)} · última de {formatarBRL(t.valor)}</li>
          ))}
        </ul>
      </Moldura>
    </div>
  )
}
