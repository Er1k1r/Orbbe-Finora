export type Tema = 'claro' | 'escuro'
const CHAVE = 'financas.tema'

/** Tema em vigor: a escolha salva ou, sem ela, o do sistema. */
export function temaAtual(): Tema {
  const marcado = document.documentElement.getAttribute('data-theme')
  if (marcado === 'claro' || marcado === 'escuro') return marcado
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'
}
export function escolherTema(t: Tema) {
  document.documentElement.setAttribute('data-theme', t)
  try { localStorage.setItem(CHAVE, t) } catch { /* modo privado: vale só nesta sessão */ }
}
