import { describe, it, expect } from 'vitest'
import { interpretarNotificacao } from './notificacao'

const n = (pacote: string, titulo: string, texto: string) => ({ pacote, titulo, texto })

describe('interpretarNotificacao', () => {
  it('compra no Nubank', () => {
    expect(interpretarNotificacao(n('com.nu.production', 'Nubank', 'Compra aprovada de R$ 32,90 em PADARIA DOCE PÃO'))).toEqual({
      valor: 3290, tipo: 'saida', estabelecimento: 'PADARIA DOCE PÃO', categoriaId: 'alimentacao', banco: 'Nubank',
    })
  })
  it('transferência recebida com milhar', () => {
    expect(interpretarNotificacao(n('com.itau.app', 'Itaú', 'Você recebeu uma transferência de R$ 1.250,00 de João Silva'))).toEqual({
      valor: 125000, tipo: 'entrada', estabelecimento: 'João Silva', categoriaId: 'extras', banco: 'Itaú',
    })
  })
  it('pix enviado', () => {
    const r = interpretarNotificacao(n('br.com.intermedium', 'Inter', 'Você enviou um Pix de R$ 80,00 para Maria'))
    expect(r).toMatchObject({ valor: 8000, tipo: 'saida', estabelecimento: 'Maria', categoriaId: 'outros' })
  })
  it('categoria por estabelecimento', () => {
    expect(interpretarNotificacao(n('com.nu.production', 'Nubank', 'Compra aprovada de R$ 200,00 em POSTO IPIRANGA'))?.categoriaId).toBe('veiculo')
  })
  it('ignora app que não é banco', () =>
    expect(interpretarNotificacao(n('com.whatsapp', 'Ana', 'Paguei R$ 10,00 pra você'))).toBeNull())
  it('ignora texto sem valor', () =>
    expect(interpretarNotificacao(n('com.nu.production', 'Nubank', 'Seu extrato está disponível'))).toBeNull())
  it('ignora valor sem direção (fatura)', () =>
    expect(interpretarNotificacao(n('com.nu.production', 'Nubank', 'Fatura fechada R$ 100,00'))).toBeNull())
})
