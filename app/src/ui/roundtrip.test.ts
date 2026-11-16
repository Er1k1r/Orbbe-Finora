import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../data/db'
import { exportar, importar } from '../data/backup'
import { CATEGORIAS_PADRAO } from '../data/seed'
import { substituirPlano } from '../data/planos'
import { semVazios } from '../test-ajuda'
import { analisarCarne } from './contratoForm'
import {
  desvincularContrato, montarCategoria, montarConferencia, montarConta, montarFonte, montarLancamentoRapido, montarPagamento,
  montarParcelado, montarPlano, montarRenda, montarTransferencia, type EntradaRapida,
} from './construtores'
import { cancelarRecorrencia, gerarRecorrentes } from '../domain/recorrencia'
import type { Lancamento } from '../domain/tipos'

beforeEach(async () => { await db.delete(); await db.open() })

const rapida = (p: Partial<EntradaRapida>): EntradaRapida => ({
  id: 'x', tipo: 'saida', categoria: { id: 'mercado', natureza: 'variavel' }, natureza: 'auto', contaId: 'c1',
  descricao: '', observacao: '', valor: 1000, data: '2026-10-19', pendente: false, fonteId: '', modo: 'comum',
  financiamentoId: '', pagamento: 'parcela', repete: false, ate: '', ...p,
})

/** Monta linhas de cada tipo (e de cada variação) usando só os construtores das telas. */
function construirTudo() {
  const categorias = [...CATEGORIAS_PADRAO, montarCategoria({ id: 'pets', nome: ' Pets ', icone: 'PawPrint', tipo: 'saida', natureza: 'variavel', essencial: false })]
  const renda = montarRenda({
    opcoes: [{ tipo: 'fixa', nome: 'Salário fixo' }, { tipo: 'variavel', nome: 'Vendas / negócio próprio' }],
    sel: { fixa: '350000', variavel: '' }, ids: { conta: 'c1', fixa: 'f1', variavel: 'f2', eventual: 'f3' }, saldoDigitos: '120000',
  })
  const contas = [
    renda.conta,
    montarConta({ id: 'c2', nome: ' Nubank ', tipo: 'banco', saldoInicial: 0, reserva: true },
      { saldoDigitos: '25000', negativo: true, limiteDigitos: '100000', taxa: 0.0899 }),
    montarConta({ id: 'c3', nome: 'Carteira', tipo: 'carteira', saldoInicial: 0 }, { saldoDigitos: '', negativo: false, limiteDigitos: '', taxa: undefined }),
  ]
  const fontes = [
    ...renda.fontes.map((f) => (f.id === 'f1' ? montarFonte(f, '350000', '5') : f)),
    montarFonte({ id: 'f4', nome: 'Bicos', tipo: 'eventual', valorEsperado: 0 }, '', '20'),
  ]
  const campos = { nome: ' Carro ', valorFin: '1200000', valorParc: '62000', total: '24', pagas: '2', primeira: '2026-08-05', sistema: 'SAC' as const, taxaTexto: '' }
  const analise = analisarCarne(campos)
  expect(analise.erros).toEqual([])
  const financiamentos = [{ ...analise.contrato, id: 'fin1', nome: campos.nome.trim() }]
  const planos = [montarPlano({ id: 'p1', financiamentoId: 'fin1', aporte: 50000, efeito: 'reduzir_parcela' })!]

  const modelo = montarLancamentoRapido(rapida({ id: 'rec', descricao: 'Aluguel', valor: 150000, data: '2026-08-05', repete: true, ate: '2027-03' }))
  const { copias, modelos } = gerarRecorrentes([modelo], '2026-10-19')
  const encerrado = cancelarRecorrencia({ ...modelo, id: 'rec2' }, '2026-10')
  const pagoComVinculo = montarPagamento({ id: 'pg1', valor: 62000, data: '2026-10-05', categoriaId: 'outros', contaId: 'c1', tipo: 'parcela', descricao: 'Parcela 3 · Carro', financiamentoId: 'fin1' })
  const lancamentos: Lancamento[] = [
    montarLancamentoRapido(rapida({ id: 'l1', valor: 4590, descricao: ' Feira ', observacao: 'obs' })),
    montarLancamentoRapido(rapida({ id: 'l2', tipo: 'entrada', categoria: { id: 'salario', natureza: 'variavel' }, valor: 350000, fonteId: 'f1', data: '2026-10-05' })),
    montarLancamentoRapido(rapida({ id: 'l3', pendente: true, natureza: 'fixo' })),
    modelos[0], ...copias, encerrado,
    ...montarParcelado(rapida({ descricao: 'Óculos', valor: 5000 }), 'g1', 6, 4),
    montarLancamentoRapido(rapida({ id: 'l4', modo: 'financiamento', financiamentoId: 'fin1', pagamento: 'antecipacao', valor: 100000 })),
    pagoComVinculo,
    montarPagamento({ id: 'pg2', valor: 30000, data: '2026-10-06', categoriaId: 'outros', contaId: 'c1', tipo: 'antecipacao', descricao: 'Antecipação · Carro', financiamentoId: 'fin1' }),
    montarConferencia({ id: 'aj1', contaId: 'c1', saldoApp: 100000, realDigitos: '98000', negativo: false, data: '2026-10-19' })!,
    ...montarTransferencia({ id: 'tr1', origemId: 'c1', destinoId: 'c2', valorDigitos: '5000', data: '2026-10-19', descricao: ' Reserva ' }),
    ...desvincularContrato('fin1', [pagoComVinculo]).reescrever.map((l) => ({ ...l, id: 'pg1-comum' })),
  ]
  return { categorias, contas, fontes, lancamentos, financiamentos, planos }
}

const TABELAS = ['contas', 'fontes', 'categorias', 'lancamentos', 'financiamentos', 'planos'] as const
async function ordenado() {
  const out: Record<string, unknown[]> = {}
  for (const t of TABELAS) out[t] = ((await db[t].toArray()) as { id: string }[]).sort((a, b) => a.id.localeCompare(b.id))
  return out
}

describe('ida e volta de todas as linhas construídas pelas telas', () => {
  it('construir, exportar, apagar, importar e comparar (tudo igual, sem null/undefined)', async () => {
    const t = construirTudo()
    // Pelo menos uma linha de cada variação relevante.
    expect(t.lancamentos.some((l) => l.parcelamento)).toBe(true)
    expect(t.lancamentos.some((l) => l.especie === 'transferencia')).toBe(true)
    expect(t.lancamentos.some((l) => l.especie === 'ajuste')).toBe(true)
    expect(t.lancamentos.some((l) => l.pagamentoFinanciamento === 'antecipacao')).toBe(true)
    expect(t.lancamentos.some((l) => l.recorrenciaAte && l.geradoAte)).toBe(true)
    expect(t.lancamentos.some((l) => l.origemId)).toBe(true)
    for (const tabela of Object.values(t)) semVazios(tabela)

    await db.transaction('rw', TABELAS.map((n) => db[n]), async () => {
      await db.contas.bulkPut(t.contas)
      await db.fontes.bulkPut(t.fontes)
      await db.categorias.bulkPut(t.categorias)
      await db.lancamentos.bulkPut(t.lancamentos)
      await db.financiamentos.bulkPut(t.financiamentos)
    })
    await substituirPlano('fin1', t.planos[0])

    const antes = await ordenado()
    const prefs = { objetivos: ['nao_estourar' as const, 'meta' as const], checklistFechado: true, semFinanciamento: true, contaPadraoId: t.contas[0].id }
    const json = await exportar(prefs)
    expect(json).not.toContain(':null') // o importador rejeita null; nada grava null
    await db.delete()
    await db.open()
    expect((await ordenado()).lancamentos).toEqual([]) // apagou de verdade
    expect(await importar(json)).toEqual({ preferencias: prefs }) // preferências voltam e a conta padrão existe entre as importadas
    expect(await ordenado()).toEqual(antes)
    expect(antes.lancamentos.length).toBeGreaterThan(15)
  })
})
