import type { Objetivo } from '../hooks/usePreferencias'

export type Cartao = 'sobra' | 'pendencias' | 'contas' | 'compromissos' | 'visaoGeral' | 'destino' | 'reserva' | 'insights' | 'ultimos'
  | 'comparativo' | 'recorrencia' | 'dre'

export function ordemCartoes(obj: Objetivo[]): Cartao[] {
  const extras: Cartao[] = []
  if (obj.includes('destino')) extras.push('destino')
  if (obj.includes('meta')) extras.push('reserva')
  const lista: Cartao[] = ['sobra', 'visaoGeral', ...extras, 'pendencias', 'contas', 'compromissos', 'comparativo', 'recorrencia', 'dre', 'insights', 'ultimos']
  return obj.includes('contas_em_dia') ? ['pendencias', 'contas', ...lista.filter((c) => c !== 'pendencias' && c !== 'contas')] : lista
}
