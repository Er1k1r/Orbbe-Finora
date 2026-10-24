import { describe, it, expect } from 'vitest'
import { ordemCartoes } from './ordemCartoes'

describe('ordemCartoes', () => {
  it('padrão', () =>
    expect(ordemCartoes([])).toEqual(['sobra', 'pendencias', 'compromissos', 'visaoGeral', 'insights', 'ultimos']))
  it('contas_em_dia põe pendências primeiro', () => expect(ordemCartoes(['contas_em_dia'])[0]).toBe('pendencias'))
  it('destino e meta entram depois da sobra', () =>
    expect(ordemCartoes(['destino', 'meta']).slice(0, 3)).toEqual(['sobra', 'destino', 'reserva']))
  it('nao_estourar mantém o padrão', () => expect(ordemCartoes(['nao_estourar'])).toEqual(ordemCartoes([])))
  it('compromissos aparece sempre', () => expect(ordemCartoes(['destino', 'meta', 'contas_em_dia'])).toContain('compromissos'))
  it('sem repetir cartões', () => {
    const o = ordemCartoes(['destino', 'meta', 'contas_em_dia'])
    expect(new Set(o).size).toBe(o.length)
  })
})
