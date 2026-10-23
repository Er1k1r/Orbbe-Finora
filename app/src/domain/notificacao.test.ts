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

  const nu = (texto: string, titulo = 'Nubank') => interpretarNotificacao(n('com.nu.production', titulo, texto))
  it('pagamento de fatura não vira entrada', () =>
    expect(nu('Seu pagamento de R$ 500,00 da fatura foi recebido')).toBeNull())
  it('promoção e pagamento agendado viram null', () => {
    expect(nu('Oferta: parcele em 12x de R$ 99,90 e pague com Pix')).toBeNull()
    expect(nu('Seu Pix de R$ 200,00 foi agendado')).toBeNull()
  })
  it('saldo no texto não bloqueia compra legítima', () =>
    expect(nu('Compra de R$ 10,00 em LOJA. Saldo R$ 90,00')).toMatchObject({ valor: 1000, tipo: 'saida', estabelecimento: 'LOJA' }))
  it('estabelecimento com filler após o valor', () =>
    expect(nu('Compra de R$ 12,00 aprovada em UBER *TRIP')).toMatchObject({ estabelecimento: 'UBER *TRIP', categoriaId: 'transporte' }))
  it('estabelecimento antes do valor', () => {
    expect(nu('Compra aprovada em LOJA X: R$ 30,00')).toMatchObject({ valor: 3000, estabelecimento: 'LOJA X' })
    expect(nu('Pix recebido de MARIA DA SILVA no valor de R$ 150,00')).toMatchObject({
      valor: 15000, tipo: 'entrada', estabelecimento: 'MARIA DA SILVA', categoriaId: 'extras',
    })
  })
  it('sufixo de cartão não entra no estabelecimento', () =>
    expect(nu('Compra aprovada R$ 30,00 em PADARIA X no cartão final 1234')).toMatchObject({ estabelecimento: 'PADARIA X' }))
  it('regressões de precedência', () => {
    expect(nu('Estorno de R$ 25,00')).toMatchObject({ valor: 2500, tipo: 'entrada' })
    expect(nu('Transferência recebida: R$ 3.200,00 – SALÁRIO')).toMatchObject({ tipo: 'entrada', categoriaId: 'salario', valor: 320000 })
    expect(nu('Fatura fechada R$ 100,00 vence dia 10')).toBeNull()
    expect(nu('Saldo disponível R$ 1.234,56')).toBeNull()
  })
})
