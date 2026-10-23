import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'
import { repo } from './repo'
import { exportar, importar } from './backup'

beforeEach(async () => { await db.delete(); await db.open() })

describe('backup', () => {
  it('exporta e importa', async () => {
    await repo.contas.salvar({ id: 'c1', nome: 'Banco', tipo: 'banco', saldoInicial: 1000 })
    const json = await exportar()
    await db.delete(); await db.open()
    await importar(json)
    expect(await repo.contas.listar()).toEqual([{ id: 'c1', nome: 'Banco', tipo: 'banco', saldoInicial: 1000 }])
  })
  it('rejeita JSON inválido e versão desconhecida', async () => {
    await expect(importar('não é json')).rejects.toThrow('Arquivo de backup inválido')
    await expect(importar(JSON.stringify({ versao: 99 }))).rejects.toThrow('Versão de backup não suportada')
  })
})

describe('backup: importação segura', () => {
  const conta = { id: 'c1', nome: 'Banco', tipo: 'banco' as const, saldoInicial: 1000 }
  const vazio = { contas: [], fontes: [], categorias: [], lancamentos: [], financiamentos: [], planos: [] }
  const preservou = async () => expect(await repo.contas.listar()).toEqual([conta])

  beforeEach(async () => { await repo.contas.salvar(conta) })

  it('rejeita {"versao":1} sem tabelas e preserva os dados', async () => {
    await expect(importar('{"versao":1}')).rejects.toThrow('Arquivo de backup inválido')
    await expect(importar('{"versao":1,"foo":1}')).rejects.toThrow('Arquivo de backup inválido')
    await preservou()
  })
  it('rejeita tabela que não é array e preserva os dados', async () => {
    await expect(importar(JSON.stringify({ versao: 1, ...vazio, contas: 'x' }))).rejects.toThrow('Arquivo de backup inválido')
    await preservou()
  })
  it('rejeita linha sem id string e preserva os dados', async () => {
    await expect(importar(JSON.stringify({ versao: 1, ...vazio, fontes: [{ nome: 'x' }] }))).rejects.toThrow('Arquivo de backup inválido')
    await expect(importar(JSON.stringify({ versao: 1, ...vazio, fontes: [{ id: 5 }] }))).rejects.toThrow('Arquivo de backup inválido')
    await expect(importar(JSON.stringify({ versao: 1, ...vazio, fontes: [null] }))).rejects.toThrow('Arquivo de backup inválido')
    await preservou()
  })
  it('rejeita array e null no topo sem tocar nos dados', async () => {
    await expect(importar('[]')).rejects.toThrow('Arquivo de backup inválido')
    await expect(importar('null')).rejects.toThrow('Arquivo de backup inválido')
    await preservou()
  })
  it('versão desconhecida preserva os dados', async () => {
    await expect(importar(JSON.stringify({ versao: 2, ...vazio }))).rejects.toThrow('Versão de backup não suportada')
    await preservou()
  })
  it('round-trip com todas as tabelas', async () => {
    await repo.fontes.salvar({ id: 'f1', nome: 'Salário', tipo: 'fixa', valorEsperado: 500000, diaPagamento: 5 })
    await repo.categorias.salvar({ id: 'k1', nome: 'Mercado', icone: 'ShoppingCart', tipo: 'saida', natureza: 'variavel', essencial: true })
    await repo.lancamentos.salvar({ id: 'l1', valor: 1234, data: '2026-10-01', tipo: 'saida', categoriaId: 'k1', natureza: 'variavel', contaId: 'c1', status: 'pago' })
    await repo.financiamentos.salvar({ id: 'fi1', nome: 'Casa', saldoDevedor: 10000000, taxaMensal: 0.01, prazoRestante: 120, sistema: 'SAC', diaVencimento: 10 })
    await repo.planos.salvar({ id: 'p1', financiamentoId: 'fi1', aporteExtraMensal: 50000, efeito: 'reduzir_prazo' })
    const antes = JSON.parse(await exportar())
    const json = await exportar()
    await db.delete(); await db.open()
    await importar(json)
    expect(JSON.parse(await exportar())).toEqual(antes)
    for (const t of ['contas', 'fontes', 'categorias', 'lancamentos', 'financiamentos', 'planos']) expect(antes[t]).toHaveLength(1)
  })
})
