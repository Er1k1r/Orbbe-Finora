import { describe, expect, it } from 'vitest'
import { analisarCarne, type CamposCarne } from './contratoForm'

const base: CamposCarne = {
  nome: 'Carro', valorFin: '120000', valorParc: '31200', total: '4', pagas: '', primeira: '2026-11-10', sistema: 'SAC', taxaTexto: '',
}

describe('analisarCarne', () => {
  it('calcula a taxa do carne de conferencia (SAC) e monta o contrato', () => {
    const r = analisarCarne(base)
    expect(r.implicita).toBeCloseTo(0.01, 10)
    expect(r.erros).toEqual([])
    expect(r.contrato.taxaMensal).toBeCloseTo(0.01, 10)
    expect(r.contrato.parcelasPagasAntes).toBe(0)
    expect(r.contrato.valorFinanciado).toBe(120000)
  })
  it('avisa quando a taxa informada difere do carne', () => {
    expect(analisarCarne({ ...base, taxaTexto: '2' }).taxaDifere).toBe(true)
    expect(analisarCarne({ ...base, taxaTexto: '1' }).taxaDifere).toBe(false)
    expect(analisarCarne({ ...base, taxaTexto: '1,0' }).taxaDifere).toBe(false)
    expect(analisarCarne({ ...base, taxaTexto: '' }).taxaDifere).toBe(false)
  })
  it('reporta erros: nome vazio, data vazia e carne que nao fecha', () => {
    expect(analisarCarne({ ...base, nome: '  ' }).erros[0]).toBe('Informe o nome do financiamento.')
    expect(analisarCarne({ ...base, primeira: '' }).erros).toContain('A data da primeira parcela é inválida.')
    const r = analisarCarne({ ...base, valorParc: '100' })
    expect(r.implicita).toBeNull()
    expect(r.erros.length).toBeGreaterThan(0)
  })
  it('nunca produz NaN', () => {
    const r = analisarCarne({ ...base, total: '', valorFin: '' })
    expect(Object.values(r.contrato).some((v) => typeof v === 'number' && Number.isNaN(v))).toBe(false)
    expect(r.erros.length).toBeGreaterThan(0)
  })
})
