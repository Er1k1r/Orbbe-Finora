import { describe, it, expect } from 'vitest'
import { projetarCompromissos } from './projecao'
import { criarParcelamento } from './parcelamento'
import type { Financiamento, Lancamento } from './tipos'

const s = (id: string, data: string, valor: number, p: Partial<Lancamento> = {}): Lancamento => ({
  id, valor, data, tipo: 'saida', categoriaId: 'x', natureza: 'fixo', contaId: 'c', status: 'pendente', ...p,
})
const fin: Financiamento = {
  id: 'f1', nome: 'Carro', valorFinanciado: 120000, valorParcela: 31200, totalParcelas: 4, sistema: 'SAC',
  taxaMensal: 0.01, primeiraParcela: '2026-10-05', parcelasPagasAntes: 0,
}
const oculos = criarParcelamento({
  grupoId: 'ocl', valorParcela: 5000, total: 9, parcelaAtual: 1, dataParcelaAtual: '2026-10-10', statusAtual: 'pago',
  base: { tipo: 'saida', categoriaId: 'x', natureza: 'fixo', contaId: 'c', descricao: 'Oculos' },
})
const aluguel = s('alu', '2026-07-05', 150000, { recorrencia: 'mensal', descricao: 'Aluguel', status: 'pago' })
const copia = s('alu:2026-10', '2026-10-05', 150000, { origemId: 'alu', descricao: 'Aluguel' })
const netflix = s('net', '2026-07-10', 4000, { recorrencia: 'mensal', recorrenciaAte: '2026-12', descricao: 'Netflix', status: 'pago' })
const avulsa = s('av', '2026-11-20', 10000, { descricao: 'Dentista' })

const e = { financiamentos: [fin], lancamentos: [...oculos, aluguel, copia, netflix, avulsa] }

describe('projetarCompromissos: caso conferido a mao (n = 3 a partir de 2026-10)', () => {
  const p = projetarCompromissos(e, '2026-10', 3)
  it('lista os meses pedidos', () => expect(p.meses.map((m) => m.mes)).toEqual(['2026-10', '2026-11', '2026-12']))
  // out: financiamento 31200 + oculos 5000 (paga conta) + aluguel copia 150000 + Netflix projetado 4000 = 190200
  it('outubro', () => {
    const m = p.meses[0]
    expect(m).toMatchObject({ financiamentos: 31200, parcelados: 5000, recorrencias: 154000, outros: 0, total: 190200 })
  })
  // nov: 30900 + 5000 + (150000 + 4000 projetados) + avulsa 10000 = 199900
  it('novembro', () => {
    expect(p.meses[1]).toMatchObject({ financiamentos: 30900, parcelados: 5000, recorrencias: 154000, outros: 10000, total: 199900 })
  })
  // dez: 30600 + 5000 + 154000 = 189600
  it('dezembro', () => {
    expect(p.meses[2]).toMatchObject({ financiamentos: 30600, parcelados: 5000, recorrencias: 154000, outros: 0, total: 189600 })
  })
  it('itens descrevem cada compromisso com a origem', () => {
    expect(p.meses[1].itens).toEqual(expect.arrayContaining([
      { descricao: 'Carro', valor: 30900, origem: 'financiamento' },
      { descricao: 'Oculos', valor: 5000, origem: 'parcelado' },
      { descricao: 'Aluguel', valor: 150000, origem: 'recorrencia' },
      { descricao: 'Netflix', valor: 4000, origem: 'recorrencia' },
      { descricao: 'Dentista', valor: 10000, origem: 'outro' },
    ]))
    expect(p.meses[1].itens).toHaveLength(5)
  })
  it('terminos em ordem de mes', () => {
    expect(p.terminos).toEqual([
      { descricao: 'Netflix', mes: '2026-12', valor: 4000, origem: 'recorrencia' },
      { descricao: 'Carro', mes: '2027-01', valor: 30300, origem: 'financiamento' },
      { descricao: 'Oculos', mes: '2027-06', valor: 5000, origem: 'parcelado' },
    ])
  })
})

describe('projetarCompromissos: regras', () => {
  it('padrao de 6 meses', () => expect(projetarCompromissos({ lancamentos: [], financiamentos: [] }, '2026-10').meses).toHaveLength(6))
  it('recorrente nao projeta depois de recorrenciaAte', () => {
    const p = projetarCompromissos({ lancamentos: [netflix], financiamentos: [] }, '2026-12', 2)
    expect(p.meses.map((m) => m.recorrencias)).toEqual([4000, 0])
  })
  it('copia no mes nao duplica o modelo', () => {
    const p = projetarCompromissos({ lancamentos: [aluguel, copia], financiamentos: [] }, '2026-10', 1)
    expect(p.meses[0].recorrencias).toBe(150000)
  })
  it('copia ja paga continua contando como recorrencia do mes', () => {
    const paga = { ...copia, status: 'pago' as const }
    expect(projetarCompromissos({ lancamentos: [aluguel, paga], financiamentos: [] }, '2026-10', 1).meses[0].recorrencias).toBe(150000)
  })
  it('outros so conta pendentes; pago avulso fica fora', () => {
    const l = [avulsa, s('p', '2026-11-02', 777, { status: 'pago' })]
    expect(projetarCompromissos({ lancamentos: l, financiamentos: [] }, '2026-11', 1).meses[0].outros).toBe(10000)
  })
  it('ignora movimento interno e pagamento de financiamento', () => {
    const l = [
      s('t', '2026-10-03', 9999, { especie: 'transferencia' }),
      s('pg', '2026-10-05', 31200, { financiamentoId: 'f1' }),
    ]
    const p = projetarCompromissos({ lancamentos: l, financiamentos: [fin] }, '2026-10', 1)
    expect(p.meses[0]).toMatchObject({ outros: 0, financiamentos: 31200, total: 31200 })
  })
  it('entradas pendentes nao entram', () => {
    const l = [{ ...avulsa, tipo: 'entrada' as const }]
    expect(projetarCompromissos({ lancamentos: l, financiamentos: [] }, '2026-11', 1).meses[0].total).toBe(0)
  })
  it('terminos anteriores ao mes inicial ficam de fora', () => {
    const p = projetarCompromissos({ lancamentos: [netflix, ...oculos], financiamentos: [fin] }, '2027-02', 1)
    expect(p.terminos.map((t) => t.descricao)).toEqual(['Oculos'])
  })
  it('financiamento quitado nao tem termino', () => {
    const quitado = { ...fin, parcelasPagasAntes: 4 }
    expect(projetarCompromissos({ lancamentos: [], financiamentos: [quitado] }, '2026-10', 1).terminos).toEqual([])
  })
})
