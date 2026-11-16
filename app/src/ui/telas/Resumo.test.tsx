// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Resumo from './Resumo'
import { db } from '../../data/db'
import { formatarBRL } from '../../domain/dinheiro'
import type { Lancamento } from '../../domain/tipos'
import { comDados, limparBanco } from '../../test-ui'

const mes = '2026-10'
const l = (id: string, contaId: string, valor: number, data: string, p: Partial<Lancamento> = {}): Lancamento => ({
  id, valor, data, tipo: 'saida', categoriaId: 'x', natureza: 'variavel', contaId, status: 'pago', ...p,
})

beforeEach(async () => {
  await limparBanco()
  await db.contas.bulkPut([
    { id: 'r', nome: 'Cofre', tipo: 'caixa', saldoInicial: 50000, reserva: true },
    { id: 'z', nome: 'Zeta', tipo: 'banco', saldoInicial: 0 },
    { id: 'a', nome: 'alfa', tipo: 'banco', saldoInicial: 100000 },
  ])
  await db.lancamentos.bulkPut([
    l('1', 'a', 5000, '2026-10-02', { tipo: 'entrada' }), // alfa: 100000 + 5000 - 2000 = 103000
    l('2', 'a', 2000, '2026-10-03'),
    l('3', 'z', 3000, '2026-10-05'), // Zeta: 0 - 3000 = -3000 (negativa)
    l('4', 'a', 9999, '2026-11-01'), // novembro não entra no saldo de outubro
  ])
})
afterEach(cleanup)

const cartaoContas = async () => {
  const titulo = await screen.findByRole('heading', { name: 'Contas' })
  return within(titulo.closest('a') as HTMLElement)
}

describe('Resumo: card Contas e Verificar', () => {
  it('uma linha por conta com saldo do mês visto, tag Reserva e estilo negativo', async () => {
    render(comDados(mes, <Resumo mes={mes} abrirLancamento={() => {}} />))
    const card = await cartaoContas()
    const linhas = card.getAllByRole('listitem')
    expect(linhas.map((x) => x.textContent)).toEqual([
      `alfa${formatarBRL(103000)}`,
      `Zeta${formatarBRL(-3000)}Conta negativa`,
      `CofreReserva${formatarBRL(50000)}`,
    ])
    expect(card.getByText('Reserva')).toBeTruthy()
    const valor = (i: number) => linhas[i].querySelector('.valor')!
    expect(valor(1).textContent).toBe(formatarBRL(-3000))
    expect(valor(1).className).toContain('text-negativo')
    expect(valor(0).className).not.toContain('text-negativo')
  })

  it('a soma das contas é o Saldo do Resumo', async () => {
    render(comDados(mes, <Resumo mes={mes} abrirLancamento={() => {}} />))
    const card = await cartaoContas()
    const emCentavos = (t: string) => Math.round(Number(t.replace(/[^\d,-]/g, '').replace(',', '.')) * 100)
    const soma = card.getAllByRole('listitem').reduce((acc, li) => acc + emCentavos(li.querySelector('.valor')!.textContent!), 0)
    expect(soma).toBe(103000 - 3000 + 50000)
    const rotulo = screen.getByText('Saldo', { selector: 'div' })
    expect(rotulo.parentElement!.textContent).toBe(`Saldo${formatarBRL(soma)}`)
  })

  it('o card leva a /contas e Verificar leva a /lancamentos', async () => {
    render(comDados(mes, <Resumo mes={mes} abrirLancamento={() => {}} />))
    const titulo = await screen.findByRole('heading', { name: 'Contas' })
    expect(titulo.closest('a')!.getAttribute('href')).toBe('/contas')
    expect(screen.getByRole('link', { name: 'Verificar' }).getAttribute('href')).toBe('/lancamentos')
  })
})
