import { describe, it, expect } from 'vitest'
import { gerarInsights, type ContextoInsights } from './insights'
import { simularAporte } from './amortizacao'
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
  it('não dispara com menos de 4 amostras', () => {
    const poucas = hist.slice(0, 3)
    expect(tipos(base({ lancamentos: [...poucas, sai('mer', '2026-10-05', 400000)] }))).not.toContain('pico_atipico')
  })
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
  it('com plano salvo, a sugestão parte da sobra otimizada e a economia é incremental', () => {
    // sobraNormal = 376.000 - 62.000 = 314.000; plano existente 300.000 => sobraOtimizada 14.000
    const plano = { id: 'p1', financiamentoId: 'a', aporteExtraMensal: 300000, efeito: 'reduzir_prazo' as const }
    const c = base({
      financiamentos: [f('a', 0.01)], planos: [plano],
      lancamentos: [ent('2026-10-01', 376000)],
      contas: [{ ...conta, saldoInicial: 50000000 }],
    })
    const i = achar(c, 'sobra_para_divida')
    expect(i?.dados.aporte).toBe(14000)
    const s = (x: number) => simularAporte({ saldo: 1200000, taxa: 0.01, prazo: 24, sistema: 'SAC', aporte: x, efeito: 'reduzir_prazo' })
    expect(i?.dados.economia).toBe(s(314000).economiaJuros - s(300000).economiaJuros)
  })
  it('sobra_para_divida limita o aporte ao saldo devedor', () => {
    // sobra = 10.000.000 - 62.000 = 9.938.000 > saldo devedor 1.200.000
    const c = base({
      financiamentos: [f('a', 0.01)],
      lancamentos: [ent('2026-10-01', 10000000)],
      contas: [{ ...conta, saldoInicial: 50000000 }],
    })
    expect(achar(c, 'sobra_para_divida')?.dados.aporte).toBe(1200000)
  })
  it('meses economizados no texto são incrementais ao plano salvo', () => {
    const plano = { id: 'p1', financiamentoId: 'a', aporteExtraMensal: 300000, efeito: 'reduzir_prazo' as const }
    const c = base({
      financiamentos: [f('a', 0.01)], planos: [plano],
      lancamentos: [ent('2026-10-01', 376000)],
      contas: [{ ...conta, saldoInicial: 50000000 }],
    })
    const s = (x: number) => simularAporte({ saldo: 1200000, taxa: 0.01, prazo: 24, sistema: 'SAC', aporte: x, efeito: 'reduzir_prazo' })
    const incremental = s(314000).mesesEconomizados - s(300000).mesesEconomizados
    expect(incremental).not.toBe(s(314000).mesesEconomizados)
    expect(achar(c, 'sobra_para_divida')?.detalhe).toContain(`e ${incremental} meses.`)
  })
  it('efeito segue o plano existente; sem plano usa reduzir_prazo', () => {
    const s = (x: number, efeito: 'reduzir_prazo' | 'reduzir_parcela') =>
      simularAporte({ saldo: 1200000, taxa: 0.01, prazo: 24, sistema: 'SAC', aporte: x, efeito })
    const lancamentos = [ent('2026-10-01', 500000)]
    const contas = [{ ...conta, saldoInicial: 50000000 }]
    const comPlano = base({
      financiamentos: [f('a', 0.01)], lancamentos, contas,
      planos: [{ id: 'p1', financiamentoId: 'a', aporteExtraMensal: 0, efeito: 'reduzir_parcela' }],
    })
    const semPlano = base({ financiamentos: [f('a', 0.01)], lancamentos, contas })
    // sobra = 500.000 - 62.000 = 438.000
    expect(achar(comPlano, 'sobra_para_divida')?.dados.economia).toBe(s(438000, 'reduzir_parcela').economiaJuros)
    expect(achar(semPlano, 'sobra_para_divida')?.dados.economia).toBe(s(438000, 'reduzir_prazo').economiaJuros)
    expect(s(438000, 'reduzir_parcela').economiaJuros).not.toBe(s(438000, 'reduzir_prazo').economiaJuros)
  })
  it('sobra_para_divida não dispara quando o plano já consome a sobra', () => {
    const plano = { id: 'p1', financiamentoId: 'a', aporteExtraMensal: 314000, efeito: 'reduzir_prazo' as const }
    const c = base({ financiamentos: [f('a', 0.01)], planos: [plano], lancamentos: [ent('2026-10-01', 376000)] })
    expect(tipos(c)).not.toContain('sobra_para_divida')
  })
  it('financiamento quitado (saldo 0) não é candidato', () => {
    const quitado = { ...f('a', 0.05), saldoDevedor: 0 }
    const c = base({ financiamentos: [quitado, f('b', 0.01)], lancamentos: [ent('2026-10-01', 500000)] })
    expect(tipos(c)).not.toContain('divida_mais_cara')
    expect(achar(c, 'sobra_para_divida')?.dados.financiamento).toBe('b')
  })
  it('sobra_para_divida não dispara quando a economia de juros é zero', () => {
    const c = base({ financiamentos: [f('a', 0)], lancamentos: [ent('2026-10-01', 500000)] })
    expect(tipos(c)).not.toContain('sobra_para_divida')
  })
  it('texto da taxa usa vírgula pt-BR', () => {
    const c = base({ financiamentos: [f('a', 0.0199), f('b', 0.01)] })
    expect(achar(c, 'divida_mais_cara')?.detalhe).toContain('1,99%')
  })
})

describe('reserva_baixa: texto', () => {
  it('usa vírgula decimal pt-BR nos meses cobertos', () => {
    // essencial = 100.000 (alu paga em outubro); saldo = 670.000 - 100.000 = 570.000; meta 6 * 100.000
    const c = base({
      lancamentos: [sai('alu', '2026-10-05', 100000, 'fixo')],
      contas: [{ ...conta, saldoInicial: 670000 }],
    })
    expect(gerarInsights(c).find((i) => i.tipo === 'reserva_baixa')?.detalhe).toContain('5,7 de 6 meses')
  })
})

describe('mes_de_risco', () => {
  const fontes: FonteDeRenda[] = [{ id: 'v', nome: 'Brownie', tipo: 'variavel', valorEsperado: 300000 }]
  it('dispara quando receita < esperado e fixos não cobertos', () =>
    expect(tipos(base({ fontes, lancamentos: [ent('2026-10-02', 50000, 'v'), sai('alu', '2026-10-05', 150000, 'fixo')] }))).toContain('mes_de_risco'))
  it('não dispara sem renda variável', () =>
    expect(tipos(base({ lancamentos: [sai('alu', '2026-10-05', 150000, 'fixo')] }))).not.toContain('mes_de_risco'))
  it('fonte apenas fixa + eventual não conta como variável', () => {
    const fs: FonteDeRenda[] = [fonteFixa, { id: 'ev', nome: 'Bico', tipo: 'eventual', valorEsperado: 100000 }]
    expect(tipos(base({ fontes: fs, lancamentos: [sai('alu', '2026-10-05', 150000, 'fixo')] }))).not.toContain('mes_de_risco')
  })
  it('não dispara quando recebido >= renda esperada', () => {
    const ls = [ent('2026-10-02', 300000, 'v'), sai('alu', '2026-10-05', 400000, 'fixo')]
    expect(tipos(base({ fontes, lancamentos: ls }))).not.toContain('mes_de_risco')
  })
  it('não dispara quando fixos <= recebido', () => {
    const ls = [ent('2026-10-02', 50000, 'v'), sai('alu', '2026-10-05', 40000, 'fixo')]
    expect(tipos(base({ fontes, lancamentos: ls }))).not.toContain('mes_de_risco')
  })
})

describe('pagamento de parcela (financiamentoId) fora das regras de despesa', () => {
  // SAC 3.600.000 / 24 = 150.000 + 1% de 3.600.000 = 36.000 => parcela 186.000
  const fin: Financiamento = {
    id: 'X', nome: 'Casa', saldoDevedor: 3600000, taxaMensal: 0.01, prazoRestante: 24, sistema: 'SAC', diaVencimento: 5,
  }
  const pg = (data: string, valor = 186000): Lancamento => ({ ...sai('alu', data, valor, 'fixo'), id: 'pg' + data + valor, financiamentoId: 'X' })
  const fonteVar: FonteDeRenda[] = [{ id: 'v', nome: 'Brownie', tipo: 'variavel', valorEsperado: 500000 }]
  it('regras 7 e 3: parcela paga não dobra os fixos nem vira despesa fixa alta', () => {
    // fixos = 0 + parcela 186.000 < recebido 200.000 => sem alerta; renda 500.000 (sem histórico)
    const c = base({ fontes: fonteVar, financiamentos: [fin], lancamentos: [ent('2026-10-02', 200000, 'v'), pg('2026-10-05')] })
    expect(tipos(c)).not.toContain('mes_de_risco')
    expect(tipos(c)).not.toContain('despesa_fixa_alta')
  })
  it('regras 1 e 2: pagamentos de parcela não geram gasto_crescendo nem pico_atipico', () => {
    const hist = ['2026-07-03', '2026-08-03', '2026-09-03'].map((d) => pg(d, 100000))
    const c = base({ financiamentos: [fin], lancamentos: [...hist, pg('2026-10-03', 130000)] })
    expect(tipos(c)).not.toContain('gasto_crescendo')
    const picos = ['01', '02', '03', '04'].map((d) => pg(`2026-09-${d}`, 10000))
    const c2 = base({ financiamentos: [fin], lancamentos: [...picos, pg('2026-10-05', 40000)] })
    expect(tipos(c2)).not.toContain('pico_atipico')
  })
  it('financiamentoId sem financiamento correspondente é saída comum (R4)', () => {
    const hist = ['2026-07-03', '2026-08-03', '2026-09-03'].map((d) => pg(d, 100000))
    const c = base({ financiamentos: [], lancamentos: [...hist, pg('2026-10-03', 130000)] })
    expect(tipos(c)).toContain('gasto_crescendo')
  })
})

describe('renda esperada zero (R2)', () => {
  const v: FonteDeRenda[] = [{ id: 'v', nome: 'Brownie', tipo: 'variavel', valorEsperado: 500000 }]
  // janela jul 300.000, ago 0, set 0 => mediana 0 => rendaEsperada 0
  const hist = ent('2026-07-05', 300000, 'v')
  const fixo = sai('alu', '2026-10-05', 150000, 'fixo')
  it('regra 7 dispara com renda esperada 0 e fonte variável', () =>
    expect(tipos(base({ fontes: v, lancamentos: [hist, fixo] }))).toContain('mes_de_risco'))
  it('regra 7 não dispara quando recebido cobre o valor esperado da fonte variável', () => {
    const c = base({ fontes: v, lancamentos: [hist, ent('2026-10-02', 500000, 'v'), sai('alu', '2026-10-05', 600000, 'fixo')] })
    expect(tipos(c)).not.toContain('mes_de_risco')
  })
  it('regra 7 não dispara com renda esperada 0 se fixos <= recebido', () => {
    const c = base({ fontes: v, lancamentos: [hist, ent('2026-10-02', 200000, 'v'), fixo] })
    expect(tipos(c)).not.toContain('mes_de_risco')
  })
  it('regra 3 continua exigindo renda > 0', () =>
    expect(tipos(base({ fontes: v, lancamentos: [hist, fixo] }))).not.toContain('despesa_fixa_alta'))
  const f: Financiamento = { id: 'a', nome: 'Carro', saldoDevedor: 1200000, taxaMensal: 0.01, prazoRestante: 24, sistema: 'SAC', diaVencimento: 5 }
  it('regra 8 com renda 0 e parcelas > 0 avisa que não há renda cadastrada', () => {
    const i = gerarInsights(base({ fontes: [], financiamentos: [f] })).find((x) => x.tipo === 'comprometimento_renda')
    expect(i?.severidade).toBe('alerta')
    expect(i?.titulo).toBe('Parcelas sem renda esperada cadastrada')
    expect(i?.dados).toEqual({ parcelas: 62000, renda: 0 })
  })
  it('regra 8 não dispara com renda 0 e sem parcelas', () =>
    expect(tipos(base({ fontes: [] }))).not.toContain('comprometimento_renda'))
})

describe('config', () => {
  it('limite pode ser sobrescrito', () => {
    const hist = [sai('mer', '2026-07-03', 100000), sai('mer', '2026-08-03', 100000), sai('mer', '2026-09-03', 100000)]
    const c = base({ lancamentos: [...hist, sai('mer', '2026-10-03', 110000)], config: { crescimentoMinimo: 0.05 } })
    expect(tipos(c)).toContain('gasto_crescendo')
  })
})

describe('movimentos internos', () => {
  it('transferência em categoria com histórico não dispara gasto_crescendo nem pico_atipico', () => {
    const hist = [sai('mer', '2026-07-03', 100000), sai('mer', '2026-08-03', 100000), sai('mer', '2026-09-03', 100000)]
    const transf: Lancamento = { ...sai('mer', '2026-10-03', 500000), especie: 'transferencia' }
    const t = tipos(base({ lancamentos: [...hist, transf] }))
    expect(t).not.toContain('gasto_crescendo')
    expect(t).not.toContain('pico_atipico')
  })
})
