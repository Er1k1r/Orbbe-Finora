// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Lancamentos from './Lancamentos'
import { db } from '../../data/db'
import { hojeLocal, mesDe, mesAnterior } from '../../domain/meses'
import type { Lancamento } from '../../domain/tipos'
import { comDados, limparBanco } from '../../test-ui'

const hoje = mesDe(hojeLocal())
const m2 = mesAnterior(hoje, 2)
const m1 = mesAnterior(hoje, 1)
const prox = mesAnterior(hoje, -1)

const base = { valor: 10000, tipo: 'saida' as const, categoriaId: 'x', natureza: 'fixo' as const, contaId: 'c1', status: 'pago' as const }
const modelo: Lancamento = { ...base, id: 'm', data: `${m2}-05`, recorrencia: 'mensal', geradoAte: hoje }
const copia = (mes: string): Lancamento => ({ ...base, id: `m:${mes}`, data: `${mes}-05`, origemId: 'm' })

beforeEach(async () => {
  await limparBanco()
  await db.contas.put({ id: 'c1', nome: 'Banco', tipo: 'banco', saldoInicial: 0 })
  await db.lancamentos.bulkPut([modelo, copia(m1), copia(hoje)])
})
afterEach(cleanup)

async function excluirPrimeiro(mes: string, acao: string) {
  render(comDados(mes, <Lancamentos mes={mes} />))
  fireEvent.click(await screen.findByRole('button', { name: 'Excluir lançamento' }))
  fireEvent.click(await screen.findByRole('button', { name: acao }))
}
const ids = async () => (await db.lancamentos.toArray()).map((l) => l.id).sort()

describe('Lancamentos: excluir recorrente', () => {
  it('"Só este mês" numa cópia apaga só ela (o modelo segue)', async () => {
    await excluirPrimeiro(hoje, 'Só este mês')
    await waitFor(async () => expect(await ids()).toEqual(['m', `m:${m1}`]))
    expect((await db.lancamentos.get('m'))?.recorrencia).toBe('mensal')
  })

  it('"Só este mês" no modelo: novo modelo no mês seguinte ao último coberto e cópias re-apontadas', async () => {
    await excluirPrimeiro(m2, 'Só este mês')
    const novo = `m:modelo:${prox}`
    await waitFor(async () => expect(await ids()).toEqual([novo, `m:${m1}`, `m:${hoje}`].sort()))
    const m = (await db.lancamentos.get(novo))!
    expect(m).toMatchObject({ recorrencia: 'mensal', data: `${prox}-05`, status: 'pendente', geradoAte: hoje })
    expect((await db.lancamentos.get(`m:${m1}`))?.origemId).toBe(novo)
    expect((await db.lancamentos.get(`m:${hoje}`))?.origemId).toBe(novo)
  })

  it('"Encerrar a repetição": encerra no mês atual, mantém o item e avisa', async () => {
    await excluirPrimeiro(hoje, 'Encerrar a repetição')
    await waitFor(async () => expect((await db.lancamentos.get('m'))?.recorrenciaAte).toBe(hoje))
    expect(await ids()).toEqual(['m', `m:${m1}`, `m:${hoje}`].sort())
    expect(await screen.findByText('Repetição encerrada. Este lançamento foi mantido.')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('Cancelar fecha o diálogo sem mexer no banco', async () => {
      render(comDados(hoje, <Lancamentos mes={hoje} />))
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir lançamento' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(await ids()).toEqual(['m', `m:${m1}`, `m:${hoje}`].sort())
  })
})
