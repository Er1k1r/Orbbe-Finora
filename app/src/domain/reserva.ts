import type { Centavos } from './tipos'

export function statusReserva(saldo: Centavos, custoEssencialMensal: Centavos, alvoMeses: number) {
  const cobertos = custoEssencialMensal > 0 ? Math.max(0, saldo / custoEssencialMensal) : 0
  return { cobertos, progresso: Math.min(100, (cobertos / alvoMeses) * 100) }
}
