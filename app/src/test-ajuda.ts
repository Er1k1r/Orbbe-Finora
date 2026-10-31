/** Nenhum valor `undefined`/`null` em nenhum nível: o backup rejeita null e o Dexie guardaria undefined. Só para testes. */
export function semVazios(x: unknown, caminho = 'linha'): void {
  if (x === null || x === undefined) throw new Error(`${caminho} é ${String(x)}`)
  if (Array.isArray(x)) x.forEach((v, i) => semVazios(v, `${caminho}[${i}]`))
  else if (typeof x === 'object') for (const [k, v] of Object.entries(x)) semVazios(v, `${caminho}.${k}`)
}
