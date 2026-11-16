import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'
import { repo } from './repo'
import { exportar, importar } from './backup'
import { criarAjuste, criarTransferencia } from '../domain/contas'
import { criarParcelamento } from '../domain/parcelamento'

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

describe('backup: financiamento com tipo e conta', () => {
  it('guarda e devolve tipo e contaId', async () => {
    const f = { id: 'f1', nome: 'Carro', tipo: 'carro' as const, contaId: 'c1', valorFinanciado: 100000, valorParcela: 25000, totalParcelas: 4,
      sistema: 'SAC' as const, taxaMensal: 0, primeiraParcela: '2026-09-05', parcelasPagasAntes: 0 }
    await repo.financiamentos.salvar(f)
    const json = await exportar()
    await db.delete(); await db.open()
    await importar(json)
    expect(await repo.financiamentos.listar()).toEqual([f])
  })
})

describe('backup: importação segura', () => {
  const conta = { id: 'c1', nome: 'Banco', tipo: 'banco' as const, saldoInicial: 1000 }
  const vazio = { contas: [], fontes: [], categorias: [], lancamentos: [], financiamentos: [], planos: [] }
  const preservou = async () => expect(await repo.contas.listar()).toEqual([conta])

  beforeEach(async () => { await repo.contas.salvar(conta) })

  it('rejeita {"versao":2} sem tabelas e preserva os dados', async () => {
    await expect(importar('{"versao":2}')).rejects.toThrow('Arquivo de backup inválido')
    await expect(importar('{"versao":2,"foo":1}')).rejects.toThrow('Arquivo de backup inválido')
    await preservou()
  })
  it('rejeita tabela que não é array e preserva os dados', async () => {
    await expect(importar(JSON.stringify({ versao: 2, ...vazio, contas: 'x' }))).rejects.toThrow('Arquivo de backup inválido')
    await preservou()
  })
  it('rejeita linha sem id string e preserva os dados', async () => {
    await expect(importar(JSON.stringify({ versao: 2, ...vazio, fontes: [{ nome: 'x' }] }))).rejects.toThrow('Arquivo de backup inválido')
    await expect(importar(JSON.stringify({ versao: 2, ...vazio, fontes: [{ id: 5 }] }))).rejects.toThrow('Arquivo de backup inválido')
    await expect(importar(JSON.stringify({ versao: 2, ...vazio, fontes: [null] }))).rejects.toThrow('Arquivo de backup inválido')
    await preservou()
  })
  it('rejeita array e null no topo sem tocar nos dados', async () => {
    await expect(importar('[]')).rejects.toThrow('Arquivo de backup inválido')
    await expect(importar('null')).rejects.toThrow('Arquivo de backup inválido')
    await preservou()
  })
  it('versão desconhecida preserva os dados', async () => {
    await expect(importar(JSON.stringify({ versao: 1, ...vazio }))).rejects.toThrow('Versão de backup não suportada')
    await expect(importar(JSON.stringify({ versao: 99, ...vazio }))).rejects.toThrow('Versão de backup não suportada')
    await preservou()
  })
  describe('campos com tipo errado', () => {
    const lanc = { id: 'l1', valor: 500, data: '2026-10-01', tipo: 'saida', categoriaId: 'k', natureza: 'variavel', contaId: 'c1', status: 'pago' }
    const fin = {
      id: 'fi', nome: 'Casa', valorFinanciado: 1000, valorParcela: 93, totalParcelas: 12, sistema: 'SAC',
      taxaMensal: 0.01, primeiraParcela: '2026-10-05', parcelasPagasAntes: 0,
    }
    const rejeita = async (extra: object) => {
      await expect(importar(JSON.stringify({ versao: 2, ...vazio, ...extra }))).rejects.toThrow('Arquivo de backup inválido')
      await preservou()
    }
    it('saldoInicial string', () => rejeita({ contas: [{ ...conta, saldoInicial: '1000' }] }))
    it('tipo de conta inválido', () => rejeita({ contas: [{ ...conta, tipo: 'poupanca' }] }))
    it('valor string em lançamento', () => rejeita({ lancamentos: [{ ...lanc, valor: '500' }] }))
    it('valor negativo ou fracionário', async () => {
      await rejeita({ lancamentos: [{ ...lanc, valor: -1 }] })
      await rejeita({ lancamentos: [{ ...lanc, valor: 1.5 }] })
    })
    it('lançamento sem data', () => {
      const { data: _d, ...semData } = lanc
      return rejeita({ lancamentos: [semData] })
    })
    it('data em formato errado e geradoAte errado', async () => {
      await rejeita({ lancamentos: [{ ...lanc, data: '01/10/2026' }] })
      await rejeita({ lancamentos: [{ ...lanc, geradoAte: '2026-10-01' }] })
    })
    it('data impossível ou geradoAte com mês inválido', async () => {
      await rejeita({ lancamentos: [{ ...lanc, data: '2026-13-45' }] })
      await rejeita({ lancamentos: [{ ...lanc, data: '2026-00-10' }] })
      await rejeita({ lancamentos: [{ ...lanc, data: '2026-02-30' }] })
      await rejeita({ lancamentos: [{ ...lanc, data: '2026-04-31' }] })
      await rejeita({ lancamentos: [{ ...lanc, geradoAte: '2026-13' }] })
    })
    it('aceita datas reais, inclusive 29/02 de ano bissexto', async () => {
      await importar(JSON.stringify({ versao: 2, ...vazio, lancamentos: [{ ...lanc, data: '2028-02-29', geradoAte: '2028-12' }] }))
      expect(await repo.lancamentos.listar()).toHaveLength(1)
    })
    it('enums inválidos', async () => {
      await rejeita({ lancamentos: [{ ...lanc, status: 'quitado' }] })
      await rejeita({ lancamentos: [{ ...lanc, recorrencia: 'anual' }] })
      await rejeita({ fontes: [{ id: 'f', nome: 'x', tipo: 'outra', valorEsperado: 1 }] })
      await rejeita({ categorias: [{ id: 'k', nome: 'x', icone: 'i', tipo: 'saida', natureza: 'fixo', essencial: 'sim' }] })
      await rejeita({ planos: [{ id: 'p', financiamentoId: 'fi', aporteExtraMensal: 1, efeito: 'nada' }] })
    })
    it('taxa NaN (null no JSON), negativa ou sistema inválido', async () => {
      await rejeita({ financiamentos: [{ ...fin, taxaMensal: null }] })
      await rejeita({ financiamentos: [{ ...fin, taxaMensal: -0.01 }] })
      await rejeita({ financiamentos: [{ ...fin, sistema: 'Price' }] })
      await rejeita({ financiamentos: [{ ...fin, totalParcelas: 0 }] })
      await rejeita({ financiamentos: [{ ...fin, totalParcelas: 1201 }] })
      await rejeita({ financiamentos: [{ ...fin, valorFinanciado: 0 }] })
      await rejeita({ financiamentos: [{ ...fin, valorParcela: 0.5 }] })
      await rejeita({ financiamentos: [{ ...fin, tipo: 'nave' }] })
      await rejeita({ financiamentos: [{ ...fin, contaId: 7 }] })
      await rejeita({ financiamentos: [{ ...fin, primeiraParcela: '2026-02-30' }] })
      await rejeita({ financiamentos: [{ ...fin, parcelasPagasAntes: -1 }] })
      await rejeita({ financiamentos: [{ ...fin, saldoDevedor: 1000, prazoRestante: 12, diaVencimento: 5, valorFinanciado: undefined }] })
    })
    it('campos novos de conta e categoria', async () => {
      await rejeita({ contas: [{ ...conta, limiteChequeEspecial: -1 }] })
      await rejeita({ contas: [{ ...conta, limiteChequeEspecial: 1.5 }] })
      await rejeita({ contas: [{ ...conta, taxaChequeEspecial: -0.1 }] })
      await rejeita({ contas: [{ ...conta, taxaChequeEspecial: null }] })
      await rejeita({ contas: [{ ...conta, reserva: 'sim' }] })
      await rejeita({ categorias: [{ id: 'k', nome: 'x', icone: 'i', tipo: 'saida', natureza: 'fixo', essencial: true, sistema: 'sim' }] })
    })
    it('campos novos de lançamento', async () => {
      await rejeita({ lancamentos: [{ ...lanc, descricao: 5 }] })
      await rejeita({ lancamentos: [{ ...lanc, especie: 'estorno' }] })
      await rejeita({ lancamentos: [{ ...lanc, transferenciaId: 5 }] })
      await rejeita({ lancamentos: [{ ...lanc, pagamentoFinanciamento: 'quitacao' }] })
      await rejeita({ lancamentos: [{ ...lanc, recorrenciaAte: '2026-13' }] })
    })
    it('parcelamento malformado', async () => {
      const ok = { grupoId: 'g', numero: 1, total: 3 }
      await rejeita({ lancamentos: [{ ...lanc, parcelamento: 'x' }] })
      await rejeita({ lancamentos: [{ ...lanc, parcelamento: null }] })
      await rejeita({ lancamentos: [{ ...lanc, parcelamento: [] }] })
      await rejeita({ lancamentos: [{ ...lanc, parcelamento: { ...ok, grupoId: 5 } }] })
      await rejeita({ lancamentos: [{ ...lanc, parcelamento: { ...ok, numero: 0 } }] })
      await rejeita({ lancamentos: [{ ...lanc, parcelamento: { ...ok, numero: 1.5 } }] })
      await rejeita({ lancamentos: [{ ...lanc, parcelamento: { ...ok, total: 1 } }] })
      await rejeita({ lancamentos: [{ ...lanc, parcelamento: { ...ok, total: 2.5 } }] })
      await rejeita({ lancamentos: [{ ...lanc, parcelamento: { ...ok, numero: 4 } }] })
    })
    it('aceita saldoInicial negativo e limite zero', async () => {
      await importar(JSON.stringify({ versao: 2, ...vazio, contas: [{ ...conta, saldoInicial: -5000, limiteChequeEspecial: 0, taxaChequeEspecial: 0, reserva: false }] }))
      expect((await repo.contas.listar())[0].saldoInicial).toBe(-5000)
    })
    it('fonte com diaPagamento fora de 1..31', () =>
      rejeita({ fontes: [{ id: 'f', nome: 'x', tipo: 'fixa', valorEsperado: 1, diaPagamento: 0 }] }))
  })
  it('round-trip com todas as tabelas', async () => {
    await repo.fontes.salvar({ id: 'f1', nome: 'Salário', tipo: 'fixa', valorEsperado: 500000, diaPagamento: 5 })
    await repo.categorias.salvar({ id: 'k1', nome: 'Mercado', icone: 'ShoppingCart', tipo: 'saida', natureza: 'variavel', essencial: true })
    await repo.lancamentos.salvar({ id: 'l1', valor: 1234, data: '2026-10-01', tipo: 'saida', categoriaId: 'k1', natureza: 'variavel', contaId: 'c1', status: 'pago', fonteId: 'f1', observacao: 'obs', origemId: 'm0', financiamentoId: 'fi1', recorrencia: 'mensal', geradoAte: '2026-10' })
    await repo.financiamentos.salvar({ id: 'fi1', nome: 'Casa', valorFinanciado: 10000000, valorParcela: 183333, totalParcelas: 120, sistema: 'SAC', taxaMensal: 0.01, primeiraParcela: '2026-10-10', parcelasPagasAntes: 0 })
    await repo.planos.salvar({ id: 'p1', financiamentoId: 'fi1', aporteExtraMensal: 50000, efeito: 'reduzir_prazo' })
    const antes = JSON.parse(await exportar())
    const json = await exportar()
    await db.delete(); await db.open()
    await importar(json)
    expect(JSON.parse(await exportar())).toEqual(antes)
    for (const t of ['contas', 'fontes', 'categorias', 'lancamentos', 'financiamentos', 'planos']) expect(antes[t]).toHaveLength(1)
  })
})

describe('backup v2: ida e volta com campos novos', () => {
  it('preserva tudo o que o próprio app produz', async () => {
    await repo.contas.salvar({ id: 'c1', nome: 'Banco', tipo: 'banco', saldoInicial: -20000, limiteChequeEspecial: 100000, taxaChequeEspecial: 0.08 })
    await repo.contas.salvar({ id: 'c2', nome: 'Cofre', tipo: 'caixa', saldoInicial: 0, reserva: true })
    await repo.categorias.salvar({ id: 'transferencia', nome: 'Transferência', icone: 'ArrowLeftRight', tipo: 'saida', natureza: 'variavel', essencial: false, sistema: true })
    await repo.financiamentos.salvar({ id: 'fi1', nome: 'Casa', valorFinanciado: 10000000, valorParcela: 183333, totalParcelas: 120, sistema: 'SAC', taxaMensal: 0.01, primeiraParcela: '2026-10-10', parcelasPagasAntes: 0 })
    const [saida, entrada] = criarTransferencia({ id: 't1', contaOrigemId: 'c1', contaDestinoId: 'c2', valor: 5000, data: '2026-10-02', descricao: 'Guardar' })
    const ajuste = criarAjuste({ id: 'a1', contaId: 'c1', saldoApp: 1000, saldoReal: 1500, data: '2026-10-03' })!
    const parcelas = criarParcelamento({
      grupoId: 'g1', valorParcela: 3000, total: 3, parcelaAtual: 1, dataParcelaAtual: '2026-10-05', statusAtual: 'pago',
      base: { tipo: 'saida', categoriaId: 'k1', natureza: 'variavel', contaId: 'c1', descricao: 'TV' },
    })
    const pagamento = { id: 'p1', valor: 183333, data: '2026-10-10', tipo: 'saida' as const, categoriaId: 'k1', natureza: 'fixo' as const, contaId: 'c1', status: 'pago' as const, financiamentoId: 'fi1', pagamentoFinanciamento: 'parcela' as const }
    const recorrente = { id: 'r1', valor: 100, data: '2026-10-01', tipo: 'saida' as const, categoriaId: 'k1', natureza: 'fixo' as const, contaId: 'c1', status: 'pendente' as const, recorrencia: 'mensal' as const, geradoAte: '2026-10', recorrenciaAte: '2027-03' }
    for (const l of [saida, entrada, ajuste, ...parcelas, pagamento, recorrente]) await repo.lancamentos.salvar(l)
    const json = await exportar()
    const antes = JSON.parse(json)
    expect(antes.lancamentos).toHaveLength(2 + 1 + 3 + 2)
    await db.delete(); await db.open()
    await importar(json)
    expect(JSON.parse(await exportar())).toEqual(antes)
  })
})

describe('backup v3: preferências', () => {
  const conta = { id: 'c1', nome: 'Banco', tipo: 'banco' as const, saldoInicial: 1000 }
  const vazio = { contas: [], fontes: [], categorias: [], lancamentos: [], financiamentos: [], planos: [] }
  const prefs = { objetivos: ['destino', 'meta'] as ('destino' | 'meta')[], checklistFechado: true, semFinanciamento: false, contaPadraoId: 'c1' }
  const preservou = async () => expect(await repo.contas.listar()).toEqual([conta])

  it('exporta versão 3 com preferências e importar as devolve (ida e volta)', async () => {
    await repo.contas.salvar(conta)
    const json = await exportar(prefs)
    expect(JSON.parse(json).versao).toBe(3)
    expect(JSON.parse(json).preferencias).toEqual(prefs)
    await db.delete(); await db.open()
    expect(await importar(json)).toEqual({ preferencias: prefs })
    expect(await repo.contas.listar()).toEqual([conta])
  })
  it('exportar descarta valores inválidos/chaves desconhecidas: o backup sempre é importável', async () => {
    await repo.contas.salvar(conta)
    const sujo = { objetivos: ['destino', 'rico', 5], checklistFechado: 'sim', semFinanciamento: true, contaPadraoId: 7, tema: 'x' } as never
    const json = await exportar(sujo)
    expect(JSON.parse(json).preferencias).toEqual({ objetivos: ['destino'], semFinanciamento: true })
    expect(await importar(json)).toEqual({ preferencias: { objetivos: ['destino'], semFinanciamento: true } })
    expect(JSON.parse(await exportar({ objetivos: 'x' } as never)).preferencias).toEqual({})
  })
  it('exportar sem preferências não grava o bloco; importar devolve objeto vazio', async () => {
    const json = await exportar()
    expect('preferencias' in JSON.parse(json)).toBe(false)
    expect(await importar(json)).toEqual({})
  })
  it('importa arquivo v2 (sem preferências), ignora preferencias num v2 e rejeita outras versões', async () => {
    expect(await importar(JSON.stringify({ versao: 2, ...vazio, contas: [conta] }))).toEqual({})
    expect(await importar(JSON.stringify({ versao: 2, ...vazio, contas: [conta], preferencias: { objetivos: ['x'] } }))).toEqual({})
    await expect(importar(JSON.stringify({ versao: 4, ...vazio }))).rejects.toThrow('Versão de backup não suportada')
    await expect(importar(JSON.stringify({ versao: '3', ...vazio }))).rejects.toThrow('Versão de backup não suportada')
    await preservou()
  })
  describe('rejeita preferências inválidas e preserva os dados', () => {
    const rejeita = async (preferencias: unknown) => {
      await repo.contas.salvar(conta)
      await expect(importar(JSON.stringify({ versao: 3, ...vazio, contas: [], preferencias }))).rejects.toThrow('Arquivo de backup inválido')
      await preservou()
    }
    it('objetivo desconhecido', () => rejeita({ objetivos: ['destino', 'rico'] }))
    it('objetivos que não é array', () => rejeita({ objetivos: 'destino' }))
    it('flag não booleana', async () => {
      await rejeita({ checklistFechado: 'sim' })
      await rejeita({ semFinanciamento: 1 })
    })
    it('contaPadraoId que não é texto', () => rejeita({ contaPadraoId: 5 }))
    it('bloco que não é objeto', async () => {
      await rejeita('x')
      await rejeita(null)
      await rejeita([])
    })
  })
  it('chaves desconhecidas são ignoradas e todos os campos são opcionais', async () => {
    const r = await importar(JSON.stringify({ versao: 3, ...vazio, preferencias: { tema: 'escuro', checklistFechado: true } }))
    expect(r).toEqual({ preferencias: { checklistFechado: true } })
    expect(await importar(JSON.stringify({ versao: 3, ...vazio, preferencias: {} }))).toEqual({ preferencias: {} })
  })
  it('contaPadraoId que não existe entre as contas importadas é descartada', async () => {
    const com = (id: string) => JSON.stringify({ versao: 3, ...vazio, contas: [conta], preferencias: { contaPadraoId: id, semFinanciamento: true } })
    expect(await importar(com('c1'))).toEqual({ preferencias: { contaPadraoId: 'c1', semFinanciamento: true } })
    expect(await importar(com('fantasma'))).toEqual({ preferencias: { semFinanciamento: true } })
  })
})
