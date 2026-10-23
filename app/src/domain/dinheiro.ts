import type { Centavos } from './tipos'

export function formatarBRL(c: Centavos): string {
  return (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Teclado numérico estilo caixa: dígitos digitados = centavos. */
export function centavosDeDigitos(digitos: string): Centavos {
  const limpo = digitos.replace(/\D/g, '')
  return limpo === '' ? 0 : Number(limpo)
}
