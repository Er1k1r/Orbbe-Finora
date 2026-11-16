import { centavosDeDigitos } from '../domain/dinheiro'

/** Dígitos + sinal → centavos (sem -0). */
export const comSinal = (digitos: string, negativo: boolean) => {
  const v = centavosDeDigitos(digitos)
  return negativo && v > 0 ? -v : v
}

/** Texto digitado de percent (vírgula ou ponto, até 4 casas) → fração. Vazio: undefined; inválido: NaN. */
export function fracaoDeTaxa(texto: string): number | undefined {
  const t = texto.trim()
  if (t === '') return undefined
  const m = /^(\d{1,3})?(?:[.,](\d{0,4}))?$/.exec(t)
  if (!m || (m[1] === undefined && !m[2])) return NaN
  const inteiro = m[1] ?? '0'
  const frac = (m[2] ?? '').padEnd(4, '0')
  // inteiro de "milionésimos" dividido por 1e6: uma única divisão, sem acumular erro.
  return Number(inteiro + frac) / 1e6
}

/** Fração → texto de percent pt-BR com até 4 casas, sem zeros à direita. */
export const textoDeTaxa = (fracao: number): string =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4, useGrouping: false }).format(Math.round(fracao * 1e6) / 1e4)

/** Filtra a digitação: só dígitos e um separador, até 3 inteiros e 4 decimais. */
export function filtrarTaxa(v: string): string {
  const limpo = v.replace(/[^\d.,]/g, '')
  const i = limpo.search(/[.,]/)
  if (i < 0) return limpo.slice(0, 3)
  const sep = limpo[i]
  return `${limpo.slice(0, i).slice(0, 3)}${sep}${limpo.slice(i + 1).replace(/[.,]/g, '').slice(0, 4)}`
}
