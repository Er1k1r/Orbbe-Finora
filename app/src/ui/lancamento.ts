import { formatarBRL } from '../domain/dinheiro'
import { mesDe } from '../domain/meses'
import type { Centavos, Lancamento, Parcelamento } from '../domain/tipos'
import { rotuloMes } from './rotulos'

/** Aviso quando o valor de um pagamento do tipo "parcela" difere da parcela do contrato; `null` se não há o que avisar. */
export function avisoParcela(valor: Centavos, parcela: Centavos | undefined): string | null {
  if (parcela === undefined || valor <= 0 || valor === parcela) return null
  const base = 'Pagar uma parcela sempre avança exatamente uma parcela do contrato. '
  return base + (valor > parcela
    ? `A diferença de ${formatarBRL(valor - parcela)} conta como despesa comum.`
    : 'O contrato dá a parcela por paga mesmo com valor menor.')
}

/** Prévia do parcelado ("restantes" = parcelas ainda pendentes; só inclui a de hoje quando ela está pendente). */
export function textoPrevia(r: { restantes: number; valorRestante: Centavos; ultimaData?: string }, atualPendente: boolean): string {
  const ultima = r.ultimaData ? ` · última em ${rotuloMes(mesDe(r.ultimaData))}` : ''
  return `Faltam ${r.restantes} · ${formatarBRL(r.valorRestante)}${ultima}${atualPendente ? ' (inclui a de hoje)' : ''}`
}

export const rotuloParcelamento = (p: Parcelamento): string => `${p.numero}/${p.total}`

/** Lista do mês: data mais recente primeiro; mesma data desempata por id, para a ordem não mudar entre leituras. */
export const ordenarLancamentos = (ls: Lancamento[]): Lancamento[] =>
  [...ls].sort((a, b) => b.data.localeCompare(a.data) || a.id.localeCompare(b.id))
