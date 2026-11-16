import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { substituirPlano } from './planos'
import type { PlanoAmortizacao } from '../domain/tipos'

beforeEach(async () => { await db.delete(); await db.open() })

const plano = (id: string, financiamentoId: string, aporte = 1000): PlanoAmortizacao =>
  ({ id, financiamentoId, aporteExtraMensal: aporte, efeito: 'reduzir_prazo' })

describe('substituirPlano', () => {
  it('troca o plano da dívida e não mexe nos de outras dívidas', async () => {
    await db.planos.bulkPut([plano('a1', 'A'), plano('a2', 'A', 2000), plano('b1', 'B')])
    await substituirPlano('A', plano('a3', 'A', 5000))
    expect((await db.planos.toArray()).sort((x, y) => x.id.localeCompare(y.id))).toEqual([plano('a3', 'A', 5000), plano('b1', 'B')])
  })
  it('sem novo plano, só remove', async () => {
    await db.planos.bulkPut([plano('a1', 'A'), plano('b1', 'B')])
    await substituirPlano('A', undefined)
    expect(await db.planos.toArray()).toEqual([plano('b1', 'B')])
  })
  it('é atômica: se gravar o novo falha, o plano antigo continua lá', async () => {
    await db.planos.put(plano('a1', 'A'))
    const invalido = { financiamentoId: 'A', aporteExtraMensal: 1, efeito: 'reduzir_prazo' } as unknown as PlanoAmortizacao // sem id: o put falha
    await expect(substituirPlano('A', invalido)).rejects.toThrow()
    expect(await db.planos.toArray()).toEqual([plano('a1', 'A')])
  })
})
