// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { db } from './data/db'
import { limparBanco } from './test-ui'

beforeEach(async () => {
  vi.stubGlobal('scrollTo', () => {})
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} })) // jsdom não tem
  await limparBanco()
  await db.contas.put({ id: 'c1', nome: 'Banco', tipo: 'banco', saldoInicial: 0 }) // fora do onboarding
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.location.hash = '' })

async function cabecalho(rota: string) {
  window.location.hash = rota
  render(<App />)
  return within(await screen.findByRole('banner'))
}

describe('App: cabeçalho por rota', () => {
  it.each(['#/', '#/lancamentos', '#/dividas', '#/insights', '#/compromissos'])('%s mostra o seletor de mês', async (rota) => {
    const h = await cabecalho(rota)
    expect(h.getByRole('button', { name: 'Mês anterior' })).toBeTruthy()
    expect(h.getByRole('button', { name: 'Próximo mês' })).toBeTruthy()
  })

  it.each([['#/contas', 'Contas'], ['#/fontes', 'Fontes de renda'], ['#/categorias', 'Categorias'], ['#/backup', 'Backup']])(
    '%s mostra o título "%s" e não o seletor', async (rota, titulo) => {
      const h = await cabecalho(rota)
      expect(h.getByText(titulo)).toBeTruthy()
      expect(h.queryByRole('button', { name: 'Mês anterior' })).toBeNull()
      expect(h.queryByRole('button', { name: 'Próximo mês' })).toBeNull()
    })
})
