import { describe, it, expect } from 'vitest'
import { custoEssencialMes, custoEssencialReferencia, type EntradaEssencial } from './essencial'
import { criarParcelamento } from './parcelamento'
import type { Categoria, Financiamento, Lancamento } from './tipos'

const cat = (id: string, p: Partial<Categoria> = {}): Categoria => ({
  id, nome: id, icone: 'x', tipo: 'saida', natureza: 'variavel', essencial: true, ...p,
})
const cats: Categoria[] = [
  cat('aluguel', { natureza: 'fixo' }), cat('mercado'), cat('saude'), cat('lazer', { essencial: false }),
]
const s = (id: string, categoriaId: string, data: string, valor: number, p: Partial<Lancamento> = {}): Lancamento => ({
  id, valor, data, tipo: 'saida', categoriaId, natureza: 'variavel', contaId: 'c', status: 'pago', ...p,
})
const fin: Financiamento = {
  id: 'f1', nome: 'Carro', valorFinanciado: 120000, valorParcela: 31200, totalParcelas: 4, sistema: 'SAC',
  taxaMensal: 0.01, primeiraParcela: '2026-10-05', parcelasPagasAntes: 0,
}
const modeloAluguel = s('alu', 'aluguel', '2026-07-05', 150000, { natureza: 'fixo', recorrencia: 'mensal' })
const copiaAluguel = (mes: string) =>
  s(`alu:${mes}`, 'aluguel', `${mes}-05`, 150000, { natureza: 'fixo', origemId: 'alu' })
// oculos: 5000 de out/2026 a jun/2027 (9 parcelas), a de outubro paga e o resto pendente
const oculos = criarParcelamento({
  grupoId: 'ocl', valorParcela: 5000, total: 9, parcelaAtual: 1, dataParcelaAtual: '2026-10-10', statusAtual: 'pago',
  base: { tipo: 'saida', categoriaId: 'saude', natureza: 'variavel', contaId: 'c' },
})
const mercadoHist = ['07', '08', '09'].map((m) => s(`m${m}`, 'mercado', `2026-${m}-10`, 80000))

const caso: EntradaEssencial = {
  categorias: cats,
  financiamentos: [fin],
  lancamentos: [
    ...mercadoHist, modeloAluguel, copiaAluguel('2026-08'), copiaAluguel('2026-09'), copiaAluguel('2026-10'),
    s('m10', 'mercado', '2026-10-12', 30000), s('laz', 'lazer', '2026-10-15', 20000), ...oculos,
  ],
}

describe('custoEssencialMes: caso conferido a mao (base 2026-10)', () => {
  // out: aluguel copia 150000 + mercado 30000 + oculos 5000 + parcela SAC 31200 (120000/4 = 30000 + 1% de 120000)
  //      + falta do mercado 80000 - 30000 = 50000 (saude sem historico: 0; lazer nao essencial) => 266200
  it('outubro: lancado + parcela + falta da media variavel', () => expect(custoEssencialMes(caso, '2026-10')).toBe(266200))
  // nov: oculos 5000 (pendente criado) + aluguel projetado 150000 + parcela 30000 + 900 + mercado 80000 (media, nada lancado) => 265900
  it('novembro: parcelado pendente + recorrente projetado + parcela + media', () =>
    expect(custoEssencialMes(caso, '2026-11', '2026-10')).toBe(265900))
  // dez: 5000 + 150000 + (30000 + 600) + 80000 => 265600
  it('dezembro', () => expect(custoEssencialMes(caso, '2026-12', '2026-10')).toBe(265600))
  it('referencia = media de out, nov e dez: (266200 + 265900 + 265600) / 3 = 265900', () =>
    expect(custoEssencialReferencia(caso, '2026-10')).toBe(265900))
})

describe('custoEssencialMes: componentes isolados', () => {
  const um = (lancamentos: Lancamento[], extra: Partial<EntradaEssencial> = {}, mes = '2026-10', base = mes) =>
    custoEssencialMes({ categorias: cats, financiamentos: [], lancamentos, ...extra }, mes, base)
  it('saida essencial pendente conta como a paga', () => {
    expect(um([s('a', 'aluguel', '2026-10-05', 1000), s('b', 'aluguel', '2026-10-06', 500, { status: 'pendente' })])).toBe(1500)
  })
  it('categoria nao essencial fica fora', () => expect(um([s('a', 'lazer', '2026-10-05', 1000)])).toBe(0))
  it('entrada nao conta', () => expect(um([{ ...s('a', 'aluguel', '2026-10-05', 1000), tipo: 'entrada' }])).toBe(0))
  it('movimento interno fica fora', () =>
    expect(um([s('a', 'aluguel', '2026-10-05', 1000, { especie: 'transferencia' })])).toBe(0))
  it('pagamento de financiamento fica fora (a parcela vem do contrato)', () => {
    const pg = s('pg', 'aluguel', '2026-10-05', 31200, { financiamentoId: 'f1' })
    expect(um([pg], { financiamentos: [fin] })).toBe(31200)
    expect(um([], { financiamentos: [fin] })).toBe(31200)
  })
  it('financiamentoId orfao e saida essencial comum', () => {
    expect(um([s('a', 'aluguel', '2026-10-05', 700, { financiamentoId: 'apagado' })], { financiamentos: [fin] })).toBe(31200 + 700)
  })
  it('recorrente essencial futuro sem copia entra; com copia no mes nao duplica', () => {
    expect(um([modeloAluguel], {}, '2026-11')).toBe(150000)
    expect(um([modeloAluguel, copiaAluguel('2026-11')], {}, '2026-11')).toBe(150000)
  })
  it('recorrente: nao entra antes do mes do modelo, nem depois de recorrenciaAte', () => {
    expect(um([modeloAluguel], {}, '2026-07')).toBe(150000) // o proprio modelo e lancamento do seu mes
    expect(um([modeloAluguel], {}, '2026-06')).toBe(0)
    const ate = { ...modeloAluguel, recorrenciaAte: '2026-11' }
    expect(um([ate], {}, '2026-11')).toBe(150000)
    expect(um([ate], {}, '2026-12')).toBe(0)
  })
  it('recorrente nao essencial nao entra', () => {
    expect(um([{ ...modeloAluguel, categoriaId: 'lazer' }], {}, '2026-11')).toBe(0)
  })
  it('falta para a media: so meses com gasto entre os 3 anteriores a base', () => {
    // jul 60000, ago sem gasto, set 100000 => media dos meses com gasto = 80000
    const h = [s('j', 'mercado', '2026-07-01', 60000), s('x', 'mercado', '2026-09-01', 100000)]
    expect(um(h)).toBe(80000)
    // lancado 30000 em out => falta 50000, total 30000 + 50000
    expect(um([...h, s('o', 'mercado', '2026-10-02', 30000)])).toBe(30000 + 50000)
  })
  it('falta nunca e negativa', () => {
    expect(um([s('j', 'mercado', '2026-09-01', 1000), s('o', 'mercado', '2026-10-02', 5000)])).toBe(5000)
  })
  it('categoria fixa nao tem falta para a media', () => {
    expect(um([s('j', 'aluguel', '2026-09-01', 1000)])).toBe(0)
  })
  it('media usa a base, nao o mes consultado', () => {
    const h = [s('s', 'mercado', '2026-09-01', 90000), s('o', 'mercado', '2026-10-01', 10000)]
    // base 2026-10: meses jul-set => media 90000; nov nao tem lancado => 90000
    expect(um(h, {}, '2026-11', '2026-10')).toBe(90000)
  })
  it('media arredondada', () => {
    const h = [s('a', 'mercado', '2026-08-01', 100), s('b', 'mercado', '2026-09-01', 101)]
    expect(um(h)).toBe(101) // 100,5 -> 101
  })
  it('recorrente projetado em categoria variavel abate a falta', () => {
    const m = s('m', 'mercado', '2026-08-01', 30000, { recorrencia: 'mensal' })
    const h = [s('s', 'mercado', '2026-09-01', 80000)]
    // base 2026-10: meses ago (30000, o modelo) e set (80000) => media 55000; nov: projetado 30000 => falta 25000, total 30000 + 25000
    expect(um([m, ...h], {}, '2026-11', '2026-10')).toBe(30000 + 25000)
  })
})
