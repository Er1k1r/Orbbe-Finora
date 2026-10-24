/** Só dígitos, no máximo 12 (cabe com folga em inteiro seguro: R$ 9.999.999.999,99). */
export const somenteDigitos = (v: string): string => v.replace(/\D/g, '').slice(0, 12)

/** 'YYYY-MM-DD' existente no calendário (rejeita vazio, mês 13, 30/02). */
export function dataReal(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const [a, m, d] = v.split('-').map(Number)
  return m >= 1 && m <= 12 && d >= 1 && d <= new Date(Date.UTC(a, m, 0)).getUTCDate()
}
