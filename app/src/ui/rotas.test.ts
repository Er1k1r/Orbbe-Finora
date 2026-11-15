import { describe, expect, it } from 'vitest'
import { infoDaRota } from './rotas'

describe('infoDaRota', () => {
  it('rotas em que o mês importa mostram o seletor', () => {
    for (const p of ['/', '/lancamentos', '/dividas', '/dividas/abc', '/insights', '/compromissos']) {
      expect(infoDaRota(p).mostraMes, p).toBe(true)
    }
  })
  it('rotas sem mês mostram o título da tela', () => {
    expect(infoDaRota('/contas')).toEqual({ titulo: 'Contas', mostraMes: false })
    expect(infoDaRota('/fontes')).toEqual({ titulo: 'Fontes de renda', mostraMes: false })
    expect(infoDaRota('/categorias')).toEqual({ titulo: 'Categorias', mostraMes: false })
    expect(infoDaRota('/backup')).toEqual({ titulo: 'Backup', mostraMes: false })
  })
  it('barra final não muda a rota; prefixo parecido não conta; rota desconhecida mantém o seletor', () => {
    expect(infoDaRota('/contas/').mostraMes).toBe(false)
    expect(infoDaRota('/dividas/').mostraMes).toBe(true)
    expect(infoDaRota('/contasx').mostraMes).toBe(true)
    expect(infoDaRota('/nada').mostraMes).toBe(true)
  })
})
