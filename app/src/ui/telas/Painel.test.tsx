// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Painel from './Painel'
import Lancamentos from './Lancamentos'
import { db } from '../../data/db'
import { hojeLocal, mesDe } from '../../domain/meses'
import type { Financiamento, Lancamento } from '../../domain/tipos'
import { comDados, limparBanco } from '../../test-ui'

const hoje = hojeLocal()
const mes = mesDe(hoje)
const l = (p: Partial<Lancamento>): Lancamento => ({
  id: 'x', valor: 5000, data: `${mes}-10`, tipo: 'saida', categoriaId: 'mercado', natureza: 'variavel', contaId: 'c1', status: 'pago', ...p,
})
// 4 parcelas sem juros, a primeira há 2 meses; 1 paga antes do app => hoje: 1 paga, 1 atrasada, 2 a pagar.
const primeira = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5)) - 3, 5)
const dataPrimeira = `${primeira.getFullYear()}-${String(primeira.getMonth() + 1).padStart(2, '0')}-05`
const fin: Financiamento = {
  id: 'f1', nome: 'Carro do teste', tipo: 'carro', valorFinanciado: 100000, valorParcela: 25000, totalParcelas: 4, sistema: 'SAC',
  taxaMensal: 0, primeiraParcela: dataPrimeira, parcelasPagasAntes: 1,
}

beforeEach(async () => {
  await limparBanco()
  await db.contas.put({ id: 'c1', nome: 'Banco', tipo: 'banco', saldoInicial: 0 })
  await db.categorias.bulkPut([{ id: 'mercado', nome: 'Mercado', icone: 'ShoppingCart', tipo: 'saida', natureza: 'variavel', essencial: true }])
  await db.financiamentos.put(fin)
  await db.lancamentos.bulkPut([
    l({ id: 'a', descricao: 'Feira' }),
    ...[1, 2, 3].map((n) => l({
      id: `p${n}`, descricao: 'Óculos', data: `${mes}-15`, status: n === 1 ? 'pago' : 'pendente',
      parcelamento: { grupoId: 'g', numero: n, total: 3 },
    })),
  ])
})
afterEach(cleanup)

describe('Painel', () => {
  it('pinta as parcelas do contrato: paga, atrasada e a pagar', async () => {
    render(comDados(mes, <Painel mes={mes} />))
    await screen.findByText('Carro do teste')
    const situacoes = screen.getAllByRole('img', { name: /^\d\/4 · / }).map((e) => e.getAttribute('aria-label')!.split(' · ').pop())
    expect(situacoes).toEqual(['paga', 'atrasada', 'a pagar', 'a pagar'])
  })

  it('mostra a compra parcelada com as parcelas pagas e em aberto', async () => {
    render(comDados(mes, <Painel mes={mes} />))
    await screen.findByText('Compras parceladas')
    const pontos = screen.getAllByRole('img', { name: /^\d\/3 · / }).map((e) => e.getAttribute('aria-label')!.split(' · ').pop())
    expect(pontos).toEqual(['paga', 'a pagar', 'a pagar'])
    expect(screen.getByText(/1\/3 · R\$\s50,00/)).toBeTruthy()
  })

  it('editar pelo painel grava o novo valor', async () => {
    render(comDados(mes, <Painel mes={mes} />))
    await screen.findAllByText('Feira')
    fireEvent.click(within(screen.getAllByText('Feira').map((e) => e.closest('tr')).find(Boolean)!).getByRole('button', { name: 'Editar lançamento' }))
    const campo = await screen.findByLabelText(/^Valor/)
    fireEvent.change(campo, { target: { value: '7550' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(async () => expect((await db.lancamentos.get('a'))?.valor).toBe(7550))
  })
})

describe('Lancamentos: editar', () => {
  it('o lápis abre o editor e valor zero é recusado', async () => {
    render(comDados(mes, <Lancamentos mes={mes} />))
    fireEvent.click((await screen.findAllByRole('button', { name: 'Editar lançamento' }))[0])
    fireEvent.change(await screen.findByLabelText(/^Valor/), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect((await screen.findByRole('alert')).textContent).toContain('valor maior que zero')
  })
})
