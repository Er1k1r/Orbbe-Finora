import type { Objetivo } from '../hooks/usePreferencias'

export type Cartao = 'sobra' | 'pendencias' | 'compromissos' | 'visaoGeral' | 'destino' | 'reserva' | 'insights' | 'ultimos'

export function ordemCartoes(obj: Objetivo[]): Cartao[] {
  const extras: Cartao[] = []
  if (obj.includes('destino')) extras.push('destino')
  if (obj.includes('meta')) extras.push('reserva')
  const lista: Cartao[] = ['sobra', ...extras, 'pendencias', 'compromissos', 'visaoGeral', 'insights', 'ultimos']
  return obj.includes('contas_em_dia') ? ['pendencias', ...lista.filter((c) => c !== 'pendencias')] : lista
}
