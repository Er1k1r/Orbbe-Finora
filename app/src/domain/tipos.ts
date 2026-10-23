export type Centavos = number
export type Mes = string // 'YYYY-MM'
export type TipoLancamento = 'entrada' | 'saida'
export type Natureza = 'fixo' | 'variavel'
export type StatusLancamento = 'pago' | 'pendente'
export type TipoFonte = 'fixa' | 'variavel' | 'eventual'
export type SistemaAmortizacao = 'SAC' | 'PRICE'
export type EfeitoAporte = 'reduzir_prazo' | 'reduzir_parcela'

export interface Conta {
  id: string
  nome: string
  tipo: 'banco' | 'caixa' | 'carteira'
  saldoInicial: Centavos
}
export interface FonteDeRenda {
  id: string
  nome: string
  tipo: TipoFonte
  valorEsperado: Centavos
  diaPagamento?: number
}
export interface Categoria {
  id: string
  nome: string
  icone: string
  tipo: TipoLancamento
  natureza: Natureza
  essencial: boolean
}
export interface Lancamento {
  id: string
  valor: Centavos
  data: string // 'YYYY-MM-DD'
  tipo: TipoLancamento
  categoriaId: string
  natureza: Natureza
  contaId: string
  fonteId?: string
  observacao?: string
  status: StatusLancamento
  recorrencia?: 'mensal'
  origemId?: string // lançamento-modelo de uma recorrência
  financiamentoId?: string // marca o lançamento como pagamento da parcela deste financiamento
  geradoAte?: Mes // marca d'água: recorrência já gerada até este mês (inclusive)
}
export interface Financiamento {
  id: string
  nome: string
  saldoDevedor: Centavos
  taxaMensal: number // 0.01 = 1% a.m.
  prazoRestante: number
  sistema: SistemaAmortizacao
  diaVencimento: number
}
export interface PlanoAmortizacao {
  id: string
  financiamentoId: string
  aporteExtraMensal: Centavos
  efeito: EfeitoAporte
}
