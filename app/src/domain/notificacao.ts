import type { Centavos, TipoLancamento } from './tipos'

export interface NotificacaoBruta { pacote: string; titulo: string; texto: string }
export interface LancamentoSugerido {
  valor: Centavos
  tipo: TipoLancamento
  estabelecimento: string
  categoriaId: string
  banco: string
}

// Lista inicial: validar os nomes de pacote em aparelho real na fase APK.
const BANCOS: [prefixo: string, nome: string][] = [
  ['com.nu.production', 'Nubank'],
  ['com.itau', 'Itaú'],
  ['br.com.intermedium', 'Inter'],
  ['com.bradesco', 'Bradesco'],
  ['br.com.bb.android', 'Banco do Brasil'],
  ['com.c6bank.app', 'C6 Bank'],
  ['com.mercadopago', 'Mercado Pago'],
  ['com.santander', 'Santander'],
  ['br.com.gabba.Caixa', 'Caixa'],
]

const VALOR = /R\$\s*(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})/
const ENTRADA = /recebeu|recebid|dep[óo]sito|estorno/i
const SAIDA = /compra|pagamento|pagou|d[ée]bito|enviou|enviad|saque/i
// Texto que não é transação executada (fatura, promoção, agendamento): nunca sugerir.
const IGNORAR = /fatura|oferta|parcele|ganhe|agendad|cashback|limite|promo[cç]/i
const ESTABELECIMENTO = /^[^.;:,]{0,40}?\b(?:em|no|na|para|de)\s+(.+?)\s*(?:[.;]|\s+no cart[aã]o|\s+com final|$)/i

const ESTAB_ANTES = /\b(?:em|no|na|para|de)\s+([^.;:,]+?)\s*(?:no valor de|[:\-–])?\s*$/i

const CATEGORIAS: [RegExp, string][] = [
  [/padaria|restaurante|lanchonete|ifood|pizz|burger|caf[eé]/i, 'alimentacao'],
  [/mercado|atacad|hortifruti/i, 'mercado'],
  [/posto|shell|ipiranga|combust/i, 'veiculo'],
  [/farm[aá]cia|drogaria|droga/i, 'saude'],
  [/uber|\b99\b|metr[oô]|[oô]nibus/i, 'transporte'],
  [/netflix|spotify|cinema|steam/i, 'lazer'],
]

export function interpretarNotificacao(n: NotificacaoBruta): LancamentoSugerido | null {
  const banco = BANCOS.find(([prefixo]) => n.pacote.startsWith(prefixo))?.[1]
  if (!banco) return null

  const corpo = `${n.titulo} ${n.texto}`.trim()
  if (IGNORAR.test(corpo)) return null
  const m = VALOR.exec(corpo)
  if (!m) return null

  const tipo: TipoLancamento | null = ENTRADA.test(corpo) ? 'entrada' : SAIDA.test(corpo) ? 'saida' : null
  if (!tipo) return null

  const valor = Number(m[1].replace(/\./g, '')) * 100 + Number(m[2])
  const achado =
    ESTABELECIMENTO.exec(corpo.slice(m.index + m[0].length)) ?? ESTAB_ANTES.exec(corpo.slice(0, m.index))
  const estabelecimento = achado ? achado[1].trim() : n.titulo.trim() || banco

  const categoriaId =
    tipo === 'entrada'
      ? /sal[aá]rio|folha/i.test(corpo) ? 'salario' : 'extras'
      : CATEGORIAS.find(([re]) => re.test(estabelecimento))?.[1] ?? 'outros'

  return { valor, tipo, estabelecimento, categoriaId, banco }
}
