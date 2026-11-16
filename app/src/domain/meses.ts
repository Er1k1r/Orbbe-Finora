import type { Mes } from './tipos'

export const mesDe = (data: string): Mes => data.slice(0, 7)

export function mesAnterior(mes: Mes, n: number): Mes {
  const [y, m] = mes.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 - n, 1)).toISOString().slice(0, 7)
}

/** n meses imediatamente antes de `mes`, do mais antigo ao mais recente. */
export function mesesAnteriores(mes: Mes, n: number): Mes[] {
  return Array.from({ length: n }, (_, i) => mesAnterior(mes, n - i))
}

export function fimDoMes(mes: Mes): string {
  const [y, m] = mes.split('-').map(Number)
  const dia = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return `${mes}-${String(dia).padStart(2, '0')}`
}

/** Data de hoje no calendário LOCAL ('YYYY-MM-DD'); nunca usa toISOString (UTC). */
export function hojeLocal(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Soma n meses a uma data 'YYYY-MM-DD', mantendo o dia (limitado ao último dia do mês de destino). */
export function somarMeses(data: string, n: number): string {
  const [y, m, d] = data.split('-').map(Number)
  const alvo = new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7)
  const ultimo = Number(fimDoMes(alvo).slice(8, 10))
  return `${alvo}-${String(Math.min(d, ultimo)).padStart(2, '0')}`
}

/** Quantos meses de `de` até `ate` ('YYYY-MM'); negativo se `ate` vier antes. */
export function diffMeses(de: Mes, ate: Mes): number {
  const [y1, m1] = de.split('-').map(Number)
  const [y2, m2] = ate.split('-').map(Number)
  return (y2 - y1) * 12 + (m2 - m1)
}
