import { describe, expect, it } from 'vitest'
import { avisoParcela, ordenarLancamentos, rotuloParcelamento, textoPrevia } from './lancamento'
const sp = (t: string | null) => t?.replace(/ /g, ' ')

describe('avisoParcela', () => {
  it('sem aviso quando o valor é igual ou ainda não há valor/parcela', () => {
    expect(avisoParcela(5000, 5000)).toBeNull()
    expect(avisoParcela(0, 5000)).toBeNull()
    expect(avisoParcela(5000, undefined)).toBeNull()
  })
  it('excesso conta como despesa comum', () => {
    expect(sp(avisoParcela(6000, 5000))).toContain('R$ 10,00')
    expect(avisoParcela(6000, 5000)).toContain('despesa comum')
  })
  it('valor menor ainda avança uma parcela', () => {
    expect(avisoParcela(4000, 5000)).toContain('valor menor')
  })
})

describe('textoPrevia', () => {
  it('parcela atual paga: sem "inclui a de hoje"', () => {
    expect(sp(textoPrevia({ restantes: 8, valorRestante: 40000, ultimaData: '2027-06-10' }, false)))
      .toBe('Faltam 8 · R$ 400,00 · última em jun/27')
  })
  it('parcela atual pendente: acrescenta o sufixo', () => {
    expect(sp(textoPrevia({ restantes: 9, valorRestante: 45000, ultimaData: '2027-06-10' }, true)))
      .toBe('Faltam 9 · R$ 450,00 · última em jun/27 (inclui a de hoje)')
  })
})

describe('rotuloParcelamento', () => {
  it('formata numero/total', () => {
    expect(rotuloParcelamento({ grupoId: 'g', numero: 4, total: 12 })).toBe('4/12')
  })
})

describe('ordenarLancamentos', () => {
  const l = (id: string, data: string) => ({ id, data, valor: 1, tipo: 'saida' as const, categoriaId: 'a', natureza: 'variavel' as const, contaId: 'c', status: 'pago' as const })
  it('mais recente primeiro; mesma data desempata por id, qualquer que seja a ordem de entrada', () => {
    const a = [l('b', '2026-10-05'), l('c', '2026-10-09'), l('a', '2026-10-05')]
    const esperado = ['c', 'a', 'b']
    expect(ordenarLancamentos(a).map((x) => x.id)).toEqual(esperado)
    expect(ordenarLancamentos([...a].reverse()).map((x) => x.id)).toEqual(esperado)
  })
  it('não altera o array de entrada', () => {
    const a = [l('b', '2026-10-05'), l('a', '2026-10-05')]
    ordenarLancamentos(a)
    expect(a.map((x) => x.id)).toEqual(['b', 'a'])
  })
})
