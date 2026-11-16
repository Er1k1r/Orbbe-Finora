import type { Centavos } from './tipos'

export function formatarBRL(c: Centavos): string {
  return (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Teclado numérico estilo caixa: dígitos digitados = centavos. */
export function centavosDeDigitos(digitos: string): Centavos {
  const limpo = digitos.replace(/\D/g, '')
  return limpo === '' ? 0 : Number(limpo)
}

/** Número em pt-BR com vírgula decimal (ex.: 5,7). */
export function formatarNumero(n: number, casas = 1): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

/** Fração como porcentagem pt-BR (0.0199 -> '1,99%'). */
export function formatarPct(fracao: number, casas = 2): string {
  return `${formatarNumero(fracao * 100, casas)}%`
}
