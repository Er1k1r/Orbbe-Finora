import { Link } from 'react-router-dom'
import { Moldura } from './Moldura'
import { formatarBRL, formatarNumero } from '../../domain/dinheiro'
import type { Centavos } from '../../domain/tipos'

export interface DadosReserva { saldo: Centavos; usandoTodas: boolean; custo: Centavos; alvo: number; cobertos: number; progresso: number }

export function CartaoReserva({ reserva: r, verMais = false }: { reserva: DadosReserva; verMais?: boolean }) {
  return (
    <Moldura>
      <h3 className="text-[10px] uppercase tracking-[0.2em] text-suave">Reserva</h3>
      <p className="mt-2 valor text-2xl">{formatarNumero(r.cobertos)} <span className="text-base text-suave">de {r.alvo} meses</span></p>
      <div className="mt-3 h-2 rounded-full bg-[var(--linha)]" role="progressbar" aria-label="Progresso da reserva"
        aria-valuenow={Math.round(r.progresso)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-2 rounded-full bg-marca" style={{ width: `${r.progresso}%` }} />
      </div>
      <p className="mt-2 text-sm text-suave">
        Saldo da reserva {formatarBRL(r.saldo)} · custo essencial de referência {formatarBRL(r.custo)} por mês.
        A meta é {r.alvo} meses porque {r.alvo === 12 ? 'sua renda é variável' : 'sua renda é predominantemente fixa'}.
      </p>
      {r.usandoTodas && (
        <p className="mt-2 text-sm text-suave">
          Usando o saldo de todas as contas. <Link to="/contas" className="inline-flex min-h-11 items-center font-semibold text-marca-texto">Marque a conta que é sua reserva</Link> para o cálculo ficar exato.
        </p>
      )}
      {verMais && <Link to="/insights" className="mt-3 inline-flex min-h-11 items-center font-semibold text-marca-texto">Ver insights</Link>}
    </Moldura>
  )
}
