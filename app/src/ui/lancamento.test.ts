import { describe, expect, it } from 'vitest'
import { avisoParcela, rotuloParcelamento, textoPrevia } from './lancamento'
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
