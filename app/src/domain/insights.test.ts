import { describe, it, expect } from 'vitest'
import { gerarInsights, type ContextoInsights } from './insights'
import type { Categoria, Conta, Financiamento, FonteDeRenda, Lancamento } from './tipos'

const cat = (id: string, p: Partial<Categoria> = {}): Categoria => ({
  id, nome: id, icone: 'x', tipo: 'saida', natureza: 'variavel', essencial: false, ...p,
})
const conta: Conta = { id: 'c', nome: 'B', tipo: 'banco', saldoInicial: 0 }
const sai = (categoriaId: string, data: string, valor: number, natureza: 'fixo' | 'variavel' = 'variavel'): Lancamento => ({
  id: categoriaId + data + valor, valor, data, tipo: 'saida', categoriaId, natureza, contaId: 'c', status: 'pago',
})
const ent = (data: string, valor: number, fonteId = 'f1'): Lancamento => ({
  id: 'e' + data + valor, valor, data, tipo: 'entrada', categoriaId: 'sal', natureza: 'fixo',
  contaId: 'c', fonteId, status: 'pago',
})
const fonteFixa: FonteDeRenda = { id: 'f1', nome: 'Salário', tipo: 'fixa', valorEsperado: 500000 }
const base = (p: Partial<ContextoInsights>): ContextoInsights => ({
  mes: '2026-10', lancamentos: [], categorias: [cat('mer'), cat('alu', { natureza: 'fixo', essencial: true })],
  fontes: [fonteFixa], financiamentos: [], planos: [], contas: [conta], ...p,
})
const tipos = (c: ContextoInsights) => gerarInsights(c).map((i) => i.tipo)

describe('gasto_crescendo', () => {
  const hist = [sai('mer', '2026-07-03', 100000), sai('mer', '2026-08-03', 100000), sai('mer', '2026-09-03', 100000)]
  it('dispara com +30%', () =>
    expect(tipos(base({ lancamentos: [...hist, sai('mer', '2026-10-03', 130000)] }))).toContain('gasto_crescendo'))
  it('não dispara com +10%', () =>
    expect(tipos(base({ lancamentos: [...hist, sai('mer', '2026-10-03', 110000)] }))).not.toContain('gasto_crescendo'))
})

describe('pico_atipico', () => {
  const hist = ['01', '02', '03', '04'].map((d) => sai('mer', `2026-09-${d}`, 10000))
  it('dispara acima de 3x a mediana', () =>
    expect(tipos(base({ lancamentos: [...hist, sai('mer', '2026-10-05', 40000)] }))).toContain('pico_atipico'))
  it('não dispara em valor comum', () =>
    expect(tipos(base({ lancamentos: [...hist, sai('mer', '2026-10-05', 12000)] }))).not.toContain('pico_atipico'))
})

describe('despesa_fixa_alta', () => {
  it('dispara quando fixo passa de 5% da renda', () =>
    expect(tipos(base({ lancamentos: [sai('alu', '2026-10-05', 150000, 'fixo')] }))).toContain('despesa_fixa_alta'))
  it('não dispara quando é pequena', () =>
    expect(tipos(base({ lancamentos: [sai('alu', '2026-10-05', 10000, 'fixo')] }))).not.toContain('despesa_fixa_alta'))
})

describe('reserva_baixa', () => {
  const ls = [sai('alu', '2026-10-05', 200000, 'fixo')]
  it('dispara com saldo abaixo da meta', () =>
    expect(tipos(base({ lancamentos: [ent('2026-10-01', 500000), ...ls] }))).toContain('reserva_baixa'))
  it('não dispara com saldo acima da meta', () => {
    const c = base({ lancamentos: ls, contas: [{ ...conta, saldoInicial: 5000000 }] })
    expect(tipos(c)).not.toContain('reserva_baixa')
  })
})

describe('financiamentos', () => {
  const f = (id: string, taxa: number): Financiamento => ({
    id, nome: id, saldoDevedor: 1200000, taxaMensal: taxa, prazoRestante: 24, sistema: 'SAC', diaVencimento: 5,
  })
  it('divida_mais_cara só com 2 ou mais', () => {
    expect(tipos(base({ financiamentos: [f('a', 0.01)] }))).not.toContain('divida_mais_cara')
    expect(tipos(base({ financiamentos: [f('a', 0.01), f('b', 0.02)] }))).toContain('divida_mais_cara')
  })
  it('comprometimento_renda dispara acima de 30%', () => {
    const grande = { ...f('a', 0.01), saldoDevedor: 24000000 }
    expect(tipos(base({ financiamentos: [grande] }))).toContain('comprometimento_renda')
    expect(tipos(base({ financiamentos: [f('a', 0.01)] }))).not.toContain('comprometimento_renda')
  })
  const achar = (c: ContextoInsights, t: string) => gerarInsights(c).find((i) => i.tipo === t)
  // f('a', 0.01): SAC 1.200.000 / 24 = 50.000 amortização + 1% de 1.200.000 = 12.000 juros => parcela 62.000
  // f('b', 0.02) com saldo 600.000: 600.000 / 24 = 25.000 + 2% de 600.000 = 12.000 => parcela 37.000
  it('divida_mais_cara e sobra_para_divida apontam o financiamento de maior taxa', () => {
    // sobra = 500.000 - (62.000 + 37.000) = 401.000; saldo 50.500.000 >= meta 6 * 99.000 = 594.000 (reserva ok)
    const c = base({
      financiamentos: [f('a', 0.01), { ...f('b', 0.02), saldoDevedor: 600000 }],
      lancamentos: [ent('2026-10-01', 500000)],
      contas: [{ ...conta, saldoInicial: 50000000 }],
    })
    expect(achar(c, 'divida_mais_cara')?.dados.financiamento).toBe('b')
    expect(achar(c, 'sobra_para_divida')?.dados.financiamento).toBe('b')
  })
  it('sobra_para_divida com sobra positiva e reserva no alvo', () => {
    // sobra = 500.000 - 62.000 = 438.000; saldo 50.500.000 >= meta 6 * 62.000 = 372.000
    const c = base({
      financiamentos: [f('a', 0.01)],
      lancamentos: [ent('2026-10-01', 500000)],
      contas: [{ ...conta, saldoInicial: 50000000 }],
    })
    const i = achar(c, 'sobra_para_divida')
    expect(i?.titulo).toBe('Use a sobra para quitar mais rápido')
    expect(i?.dados.aporte).toBe(438000)
  })
  it('sobra_para_divida com reserva baixa divide a sobra ao meio', () => {
    // entrada pendente: sobra = 500.000 - 62.000 = 438.000, mas saldo = 0 < meta 6 * 62.000 = 372.000
    const c = base({
      financiamentos: [f('a', 0.01)],
      lancamentos: [{ ...ent('2026-10-01', 500000), status: 'pendente' }],
    })
    const i = achar(c, 'sobra_para_divida')
    expect(i?.titulo).toBe('Divida a sobra entre reserva e dívida')
    expect(i?.dados.aporte).toBe(Math.round(438000 / 2))
  })
  it('sobra_para_divida não dispara com sobra <= 0', () => {
    // sem entradas: sobra = 0 - 62.000 = -62.000
    expect(tipos(base({ financiamentos: [f('a', 0.01)] }))).not.toContain('sobra_para_divida')
  })
  it('sobra_para_divida não dispara sem financiamento', () => {
    expect(tipos(base({ lancamentos: [ent('2026-10-01', 500000)] }))).not.toContain('sobra_para_divida')
  })
})

describe('mes_de_risco', () => {
  const fontes: FonteDeRenda[] = [{ id: 'v', nome: 'Brownie', tipo: 'variavel', valorEsperado: 300000 }]
  it('dispara quando receita < esperado e fixos não cobertos', () =>
    expect(tipos(base({ fontes, lancamentos: [ent('2026-10-02', 50000, 'v'), sai('alu', '2026-10-05', 150000, 'fixo')] }))).toContain('mes_de_risco'))
  it('não dispara sem renda variável', () =>
    expect(tipos(base({ lancamentos: [sai('alu', '2026-10-05', 150000, 'fixo')] }))).not.toContain('mes_de_risco'))
})

describe('config', () => {
  it('limite pode ser sobrescrito', () => {
    const hist = [sai('mer', '2026-07-03', 100000), sai('mer', '2026-08-03', 100000), sai('mer', '2026-09-03', 100000)]
    const c = base({ lancamentos: [...hist, sai('mer', '2026-10-03', 110000)], config: { crescimentoMinimo: 0.05 } })
    expect(tipos(c)).toContain('gasto_crescendo')
  })
})
