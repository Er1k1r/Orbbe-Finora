import { describe, it, expect } from 'vitest'
import { gerarRecorrentes, cancelarRecorrencia, modelosSemCopia, previstosDoMes, recorrentesVirtuais } from './recorrencia'
import type { Lancamento } from './tipos'

const modelo: Lancamento = {
  id: 'm1', valor: 150000, data: '2026-08-05', tipo: 'saida', categoriaId: 'mor',
  natureza: 'fixo', contaId: 'c', status: 'pago', recorrencia: 'mensal',
}

/** Aplica o resultado como a camada de dados faria: troca os modelos e acrescenta as cópias. */
const aplicar = (existentes: Lancamento[], r: ReturnType<typeof gerarRecorrentes>): Lancamento[] => [
  ...existentes.map((l) => r.modelos.find((m) => m.id === l.id) ?? l),
  ...r.copias,
]

describe('gerarRecorrentes', () => {
  it('gera meses faltantes como pendentes', () => {
    const { copias } = gerarRecorrentes([modelo], '2026-10-19')
    expect(copias.map((n) => n.data)).toEqual(['2026-09-05', '2026-10-05'])
    expect(copias.every((n) => n.origemId === 'm1' && n.status === 'pendente' && !n.recorrencia)).toBe(true)
    expect(copias.map((n) => n.id)).toEqual(['m1:2026-09', 'm1:2026-10'])
  })
  it('é idempotente', () => {
    const salvo = aplicar([modelo], gerarRecorrentes([modelo], '2026-10-19'))
    expect(gerarRecorrentes(salvo, '2026-10-19')).toEqual({ copias: [], modelos: [] })
  })
  it('ajusta dia 31 em mês curto', () => {
    const m = { ...modelo, data: '2026-01-31' }
    const { copias } = gerarRecorrentes([m], '2026-02-28')
    expect(copias.map((n) => n.data)).toEqual(['2026-02-28'])
  })
  it('atravessa dezembro para janeiro', () => {
    const m = { ...modelo, data: '2025-12-15' }
    const { copias } = gerarRecorrentes([m], '2026-02-01')
    expect(copias.map((n) => n.data)).toEqual(['2026-01-15', '2026-02-15'])
  })
  it('preenche lacunas quando só alguns meses têm cópia (sem geradoAte)', () => {
    const existente: Lancamento = { ...modelo, id: 'x', origemId: 'm1', recorrencia: undefined, data: '2026-09-05', status: 'pendente' }
    const { copias } = gerarRecorrentes([modelo, existente], '2026-11-20')
    expect(copias.map((n) => n.data)).toEqual(['2026-10-05', '2026-11-05'])
  })
  it('modelo datado no mês atual ou depois não gera nada nem muda', () => {
    expect(gerarRecorrentes([{ ...modelo, data: '2026-10-05' }], '2026-10-19')).toEqual({ copias: [], modelos: [] })
    expect(gerarRecorrentes([{ ...modelo, data: '2026-12-05' }], '2026-10-19')).toEqual({ copias: [], modelos: [] })
  })
  it('devolve o modelo com geradoAte no mês de hoje', () => {
    const { modelos } = gerarRecorrentes([modelo], '2026-10-19')
    expect(modelos).toEqual([{ ...modelo, geradoAte: '2026-10' }])
  })
  it('cópia apagada não é regenerada depois que o modelo tem geradoAte', () => {
    const salvo = aplicar([modelo], gerarRecorrentes([modelo], '2026-10-19'))
    const semSetembro = salvo.filter((l) => l.id !== 'm1:2026-09')
    expect(gerarRecorrentes(semSetembro, '2026-10-25')).toEqual({ copias: [], modelos: [] })
    // no mês seguinte só o mês novo é gerado
    const { copias } = gerarRecorrentes(semSetembro, '2026-11-02')
    expect(copias.map((c) => c.data)).toEqual(['2026-11-05'])
  })
  it('nunca emite cópia cujo id determinístico já existe (modelo sem geradoAte, cópia movida)', () => {
    // usuário moveu a cópia de setembro para outubro e mudou o valor; o modelo perdeu o geradoAte
    const movida: Lancamento = {
      ...modelo, id: 'm1:2026-09', origemId: 'm1', recorrencia: undefined,
      data: '2026-10-20', valor: 99000, status: 'pago',
    }
    const { copias, modelos } = gerarRecorrentes([modelo, movida], '2026-10-19')
    expect(copias.map((c) => c.id)).not.toContain('m1:2026-09')
    expect(copias).toEqual([])
    expect(modelos).toEqual([{ ...modelo, geradoAte: '2026-10' }])
  })
  it('chamar duas vezes com as mesmas entradas dá ids idênticos (StrictMode)', () => {
    const a = gerarRecorrentes([modelo], '2026-10-19')
    const b = gerarRecorrentes([modelo], '2026-10-19')
    expect(a).toEqual(b)
    expect(a.copias.map((c) => c.id)).toEqual(b.copias.map((c) => c.id))
  })
  it('não gera meses após recorrenciaAte', () => {
    const m = { ...modelo, data: '2026-07-05', recorrenciaAte: '2026-08' }
    const { copias } = gerarRecorrentes([m], '2026-10-19')
    expect(copias.map((c) => c.data)).toEqual(['2026-08-05'])
  })
  it('as cópias não herdam recorrenciaAte', () => {
    const m = { ...modelo, data: '2026-07-05', recorrenciaAte: '2026-09' }
    const { copias } = gerarRecorrentes([m], '2026-10-19')
    expect(copias.length).toBe(2)
    expect(copias.every((c) => !('recorrenciaAte' in c))).toBe(true)
  })
  it('cancelarRecorrencia define recorrenciaAte sem mutar o modelo', () => {
    const r = cancelarRecorrencia(modelo, '2026-10')
    expect(r).toEqual({ ...modelo, recorrenciaAte: '2026-10' })
    expect(modelo.recorrenciaAte).toBeUndefined()
  })
})

describe("marca d'água com recorrenciaAte", () => {
  it('não avança além de recorrenciaAte e a reativação gera os meses seguintes', () => {
    const cancelado = cancelarRecorrencia(modelo, '2026-10')
    const r1 = gerarRecorrentes([cancelado], '2026-12-10')
    expect(r1.copias.map((c) => c.data)).toEqual(['2026-09-05', '2026-10-05'])
    expect(r1.modelos[0].geradoAte).toBe('2026-10')
    // reativa: remove recorrenciaAte, preservando o geradoAte salvo
    const salvo = aplicar([cancelado], r1)
    const { recorrenciaAte: _a, ...reativado } = salvo.find((l) => l.id === 'm1') as Lancamento
    const r2 = gerarRecorrentes([...salvo.filter((l) => l.id !== 'm1'), reativado], '2026-12-10')
    expect(r2.copias.map((c) => c.data)).toEqual(['2026-11-05', '2026-12-05'])
    expect(r2.modelos[0].geradoAte).toBe('2026-12')
  })
  it('sem recorrenciaAte a marca segue o mês de hoje', () => {
    expect(gerarRecorrentes([modelo], '2026-12-10').modelos[0].geradoAte).toBe('2026-12')
  })
})

describe('modelosSemCopia e recorrentesVirtuais (fonte única de recorrência pendente)', () => {
  const m = { ...modelo, geradoAte: '2026-10' as const }
  it('meses <= geradoAte contam como cobertos mesmo sem cópia (cópia apagada não ressuscita)', () => {
    expect(modelosSemCopia([m], [m], '2026-10')).toEqual([])
    expect(modelosSemCopia([m], [m], '2026-11')).toEqual([m])
  })
  it('sem marca d\'água, lista do mês seguinte ao do modelo até o mês pedido, pulando meses com cópia', () => {
    const sem = { ...modelo, data: '2026-07-05' }
    const copiaSet: Lancamento = { ...modelo, id: 'm1:2026-09', data: '2026-09-05', origemId: 'm1', recorrencia: undefined }
    expect(recorrentesVirtuais([sem], [sem, copiaSet], '2026-11').map((v) => v.mes)).toEqual(['2026-08', '2026-10', '2026-11'])
  })
  it('para em recorrenciaAte', () => {
    const c = { ...modelo, data: '2026-08-05', recorrenciaAte: '2026-10' }
    expect(recorrentesVirtuais([c], [c], '2026-12').map((v) => v.mes)).toEqual(['2026-09', '2026-10'])
  })
})

describe('previstosDoMes', () => {
  // modelo m1: 2026-08-05, mensal. Meses virtuais possíveis: set, out, nov...
  it('traz o previsto do mês visto (id determinístico, pendente, origem no modelo) e nada de outros meses', () => {
    const r = previstosDoMes([modelo], '2026-10')
    expect(r).toEqual([{ ...modelo, id: 'm1:2026-10', data: '2026-10-05', status: 'pendente', origemId: 'm1', recorrencia: undefined }]
      .map(({ recorrencia: _r, ...x }) => x))
    expect(previstosDoMes([modelo], '2026-08')).toEqual([]) // o mês do próprio modelo é real, não previsto
    expect(previstosDoMes([modelo], '2026-07')).toEqual([]) // antes do modelo
  })
  it('nunca duplica uma cópia real do mês', () => {
    const copia: Lancamento = { ...modelo, id: 'm1:2026-10', data: '2026-10-05', status: 'pendente', origemId: 'm1' }
    delete copia.recorrencia
    expect(previstosDoMes([modelo, copia], '2026-10')).toEqual([])
  })
  it('respeita a marca d\'água geradoAte (cópia apagada não ressuscita) e recorrenciaAte', () => {
    expect(previstosDoMes([{ ...modelo, geradoAte: '2026-10' }], '2026-10')).toEqual([])
    expect(previstosDoMes([{ ...modelo, geradoAte: '2026-10' }], '2026-11')).toHaveLength(1)
    expect(previstosDoMes([{ ...modelo, recorrenciaAte: '2026-10' }], '2026-10')).toHaveLength(1)
    expect(previstosDoMes([{ ...modelo, recorrenciaAte: '2026-10' }], '2026-11')).toEqual([])
  })
  it('limita o dia ao fim do mês e ignora lançamentos que não são modelos', () => {
    const m31 = { ...modelo, id: 'm31', data: '2026-01-31' }
    expect(previstosDoMes([m31, { ...modelo, id: 'z', recorrencia: undefined }], '2026-02').map((l) => [l.id, l.data])).toEqual([['m31:2026-02', '2026-02-28']])
  })
  it('o filtro de tipo (Entradas/Saídas) vale para os previstos', () => {
    const b = { ...modelo, id: 'm2', tipo: 'entrada' as const }
    expect(previstosDoMes([modelo, b], '2026-09', 'entrada').map((l) => l.id)).toEqual(['m2:2026-09'])
    expect(previstosDoMes([modelo, b], '2026-09', 'saida').map((l) => l.id)).toEqual(['m1:2026-09'])
  })
  it('vários modelos no mesmo mês', () => {
    const b = { ...modelo, id: 'm2', tipo: 'entrada' as const }
    expect(previstosDoMes([modelo, b], '2026-09').map((l) => l.id).sort()).toEqual(['m1:2026-09', 'm2:2026-09'])
  })
})
