import { somarMeses } from './meses'
import type { Centavos, Lancamento, StatusLancamento } from './tipos'

export interface NovoParcelamento {
  grupoId: string
  valorParcela: Centavos
  total: number
  parcelaAtual: number
  dataParcelaAtual: string
  statusAtual: StatusLancamento
  base: Omit<Lancamento, 'id' | 'valor' | 'data' | 'status' | 'parcelamento' | 'recorrencia' | 'origemId' | 'geradoAte' | 'recorrenciaAte'>
}

export function criarParcelamento(e: NovoParcelamento): Lancamento[] {
  if (!Number.isInteger(e.total) || e.total < 2) throw new Error('Uma compra parcelada precisa de pelo menos 2 parcelas.')
  if (!Number.isInteger(e.parcelaAtual) || e.parcelaAtual < 1 || e.parcelaAtual > e.total)
    throw new Error('A parcela atual deve estar entre 1 e o total de parcelas.')
  if (!Number.isSafeInteger(e.valorParcela) || e.valorParcela <= 0) throw new Error('O valor da parcela deve ser maior que zero.')
  const out: Lancamento[] = []
  for (let n = e.parcelaAtual; n <= e.total; n++) {
    out.push({
      ...e.base,
      id: `${e.grupoId}:${n}`,
      valor: e.valorParcela,
      data: somarMeses(e.dataParcelaAtual, n - e.parcelaAtual),
      status: n === e.parcelaAtual ? e.statusAtual : 'pendente',
      parcelamento: { grupoId: e.grupoId, numero: n, total: e.total },
    })
  }
  return out
}

export function resumoParcelamento(grupo: Lancamento[]) {
  const ordenado = [...grupo].sort((a, b) => (a.parcelamento?.numero ?? 0) - (b.parcelamento?.numero ?? 0))
  const pend = ordenado.filter((l) => l.status === 'pendente')
  return {
    pagas: ordenado.length - pend.length,
    restantes: pend.length,
    valorRestante: pend.reduce((s, l) => s + l.valor, 0),
    ultimaData: ordenado[ordenado.length - 1]?.data,
    total: ordenado[0]?.parcelamento?.total ?? 0,
  }
}
