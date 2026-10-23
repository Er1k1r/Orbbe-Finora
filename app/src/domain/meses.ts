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
