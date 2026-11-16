// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
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
      expect(h.getByText(titulo, { selector: 'header span' })).toBeTruthy()
      expect(h.queryByRole('button', { name: 'Mês anterior' })).toBeNull()
      expect(h.queryByRole('button', { name: 'Próximo mês' })).toBeNull()
    })
})

describe('App: barra lateral recolhível', () => {
  it('recolhe, mostra só ícones com nome acessível e lembra a escolha', async () => {
    window.location.hash = '#/'
    localStorage.removeItem('finora.barra')
    render(<App />)
    const barra = await screen.findByRole('navigation', { name: 'Menu lateral' })
    expect(within(barra).getByText('Lançamentos')).toBeTruthy()
    fireEvent.click(within(barra).getByRole('button', { name: 'Recolher menu' }))
    expect(within(barra).queryByText('Lançamentos')).toBeNull()
    expect(within(barra).getByRole('link', { name: 'Lançamentos' })).toBeTruthy()
    expect(within(barra).getByRole('button', { name: 'Expandir menu' }).getAttribute('aria-expanded')).toBe('false')
    expect(localStorage.getItem('finora.barra')).toBe('recolhida')
    localStorage.removeItem('finora.barra')
  })
})
