import { Moldura } from '../componentes/Moldura'
import { CartaoReserva } from '../componentes/CartaoReserva'
import { useResumo } from '../hooks/useResumo'

export default function Insights({ mes }: { mes: string }) {
  // `reserva` e a lista ordenada (contas negativas, alertas, informativos) vêm do hook, no mês visto.
  const { todosInsights, reserva } = useResumo(mes)

  return (
    <div className="grid gap-5">
      <CartaoReserva reserva={reserva} />
      {todosInsights.length === 0 && <Moldura><p className="text-suave">Sem alertas este mês.</p></Moldura>}
      {todosInsights.map((i) => (
        <Moldura key={i.id}>
          <div className={`font-semibold ${i.severidade === 'alerta' ? 'text-negativo' : ''}`}>{i.titulo}</div>
          <p className="mt-1 text-sm text-suave">{i.detalhe}</p>
        </Moldura>
      ))}
    </div>
  )
}
