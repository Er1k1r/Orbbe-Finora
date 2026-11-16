import { taxaImplicita, validarContrato } from '../domain/contrato'
import { centavosDeDigitos } from '../domain/dinheiro'
import type { Contrato, SistemaAmortizacao } from '../domain/tipos'
import { fracaoDeTaxa } from './valores'

export interface CamposCarne {
  nome: string
  valorFin: string // dígitos = centavos
  valorParc: string // dígitos = centavos
  total: string // dígitos
  pagas: string // dígitos (vazio = 0)
  primeira: string // 'YYYY-MM-DD' ou vazio
  sistema: SistemaAmortizacao
  taxaTexto: string // % ao mês opcional
}

/** Tolerância para dizer que a taxa digitada "bate" com a do carnê: 0,05 ponto percentual. */
const TOLERANCIA = 0.0005

/** Transforma os campos do formulário em contrato, taxa do carnê, aviso de divergência e erros (pt-BR). */
export function analisarCarne(c: CamposCarne) {
  const dados = {
    valorFinanciado: centavosDeDigitos(c.valorFin),
    valorParcela: centavosDeDigitos(c.valorParc),
    totalParcelas: Number(c.total || '0'),
    sistema: c.sistema,
  }
  const implicita = taxaImplicita(dados)
  const informada = fracaoDeTaxa(c.taxaTexto)
  const taxaDifere =
    implicita !== null && informada !== undefined && Number.isFinite(informada) && Math.abs(informada - implicita) > TOLERANCIA
  const contrato: Contrato = {
    ...dados,
    taxaMensal: implicita ?? 0, // com null, validarContrato já reporta o problema
    primeiraParcela: c.primeira,
    parcelasPagasAntes: Number(c.pagas || '0'),
  }
  const erros = validarContrato(contrato)
  if (!c.nome.trim()) erros.unshift('Informe o nome do financiamento.')
  return { contrato, implicita, informada, taxaDifere, erros }
}
