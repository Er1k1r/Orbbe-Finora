import { saldoContas } from './fluxo'
import { fimDoMes, mesDe } from './meses'
import type { Centavos, Conta, Lancamento, Mes } from './tipos'

export interface SituacaoConta {
  contaId: string
  saldo: Centavos
  previsto: Centavos
  negativa: boolean
  ficaraNegativa: boolean
  usoLimite: Centavos
  limiteDisponivel?: Centavos
  jurosEstimadoMes: Centavos
}

/**
 * Situação de cada conta no mês. O saldo vem de `saldoContas` (pagos até o fim do mês).
 * `previsto` soma os pendentes da conta com mês <= `mes`, inclusive movimentos internos pendentes:
 * mesmo pendente, uma transferência ainda vai mexer no saldo daquela conta.
 */
export function situacaoContas(contas: Conta[], lancs: Lancamento[], mes: Mes): SituacaoConta[] {
  return contas.map((c) => {
    const daConta = lancs.filter((l) => l.contaId === c.id)
    const saldo = saldoContas([c], daConta, fimDoMes(mes))
    const pendentes = daConta.filter((l) => l.status === 'pendente' && mesDe(l.data) <= mes)
    const previsto = pendentes.reduce((s, l) => s + (l.tipo === 'entrada' ? l.valor : -l.valor), saldo)
    const usoLimite = Math.max(0, -saldo)
    return {
      contaId: c.id,
      saldo,
      previsto,
      negativa: saldo < 0,
      ficaraNegativa: saldo >= 0 && previsto < 0,
      usoLimite,
      limiteDisponivel: c.limiteChequeEspecial === undefined ? undefined : c.limiteChequeEspecial - usoLimite,
      jurosEstimadoMes: Math.round(usoLimite * (c.taxaChequeEspecial ?? 0)),
    }
  })
}

/** Saldo da reserva de emergência: contas marcadas `reserva`; sem nenhuma marcada, todas. Com `ate`, só pagos até essa data. */
export function saldoReserva(contas: Conta[], lancs: Lancamento[], ate?: string): { saldo: Centavos; usandoTodas: boolean } {
  const marcadas = contas.filter((c) => c.reserva)
  const usandoTodas = marcadas.length === 0
  const alvo = usandoTodas ? contas : marcadas
  const ids = new Set(alvo.map((c) => c.id))
  return { saldo: saldoContas(alvo, lancs.filter((l) => ids.has(l.contaId)), ate), usandoTodas }
}

export interface EntradaTransferencia {
  id: string
  contaOrigemId: string
  contaDestinoId: string
  valor: Centavos
  data: string
  descricao?: string
}

/** Par saída (origem) / entrada (destino); movimento interno, mexe só no saldo das contas. */
export function criarTransferencia(e: EntradaTransferencia): [Lancamento, Lancamento] {
  if (e.contaOrigemId === e.contaDestinoId) throw new Error('Escolha contas diferentes para a transferência.')
  if (!(e.valor > 0)) throw new Error('O valor da transferência deve ser maior que zero.')
  const comum = {
    valor: e.valor, data: e.data, categoriaId: 'transferencia', natureza: 'variavel' as const,
    status: 'pago' as const, especie: 'transferencia' as const, transferenciaId: e.id,
    ...(e.descricao === undefined ? {} : { descricao: e.descricao }),
  }
  return [
    { ...comum, id: `${e.id}:saida`, tipo: 'saida', contaId: e.contaOrigemId },
    { ...comum, id: `${e.id}:entrada`, tipo: 'entrada', contaId: e.contaDestinoId },
  ]
}

/** Lançamento que leva o saldo do app ao saldo real do banco; `null` se já conferem. */
export function criarAjuste(e: { id: string; contaId: string; saldoApp: Centavos; saldoReal: Centavos; data: string }): Lancamento | null {
  const dif = e.saldoReal - e.saldoApp
  if (dif === 0) return null
  return {
    id: e.id, valor: Math.abs(dif), data: e.data, tipo: dif > 0 ? 'entrada' : 'saida', categoriaId: 'ajuste',
    natureza: 'variavel', contaId: e.contaId, status: 'pago', especie: 'ajuste', descricao: 'Ajuste de conferência',
  }
}
