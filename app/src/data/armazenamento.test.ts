import { describe, it, expect } from 'vitest'
import { pedirPersistencia } from './armazenamento'

describe('pedirPersistencia', () => {
  it('indisponível sem a API', async () => {
    expect(await pedirPersistencia(undefined)).toBe('indisponivel')
    expect(await pedirPersistencia({})).toBe('indisponivel')
    expect(await pedirPersistencia({ storage: { persist: async () => true } })).toBe('indisponivel')
  })
  it('persistente se já persistido, sem pedir de novo', async () => {
    let pediu = false
    const nav = { storage: { persisted: async () => true, persist: async () => { pediu = true; return true } } }
    expect(await pedirPersistencia(nav)).toBe('persistente')
    expect(pediu).toBe(false)
  })
  it('persistente se o navegador concede', async () => {
    expect(await pedirPersistencia({ storage: { persisted: async () => false, persist: async () => true } })).toBe('persistente')
  })
  it('não persistente se o navegador nega', async () => {
    expect(await pedirPersistencia({ storage: { persisted: async () => false, persist: async () => false } })).toBe('nao_persistente')
  })
})
