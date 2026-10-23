import { mesDe, mesesAnteriores } from './meses'
import type { Categoria, Centavos, FonteDeRenda, Lancamento, Mes } from './tipos'

const media = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length
function mediana(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export function rendaEsperada(fontes: FonteDeRenda[], lancs: Lancamento[], mes: Mes): Centavos {
  const anteriores = mesesAnteriores(mes, 3)
  let total = 0
  for (const f of fontes) {
    if (f.tipo === 'fixa') total += f.valorEsperado
    else if (f.tipo === 'variavel') {
      const porMes = anteriores
        .map((m) => lancs.filter((l) => l.fonteId === f.id && l.tipo === 'entrada' && mesDe(l.data) === m))
        .filter((ls) => ls.length > 0)
        .map((ls) => ls.reduce((s, l) => s + l.valor, 0))
      total += porMes.length === 0 ? f.valorEsperado : Math.round(Math.min(media(porMes), mediana(porMes)))
    }
  }
  return total
}

export function reservaAlvoMeses(fontes: FonteDeRenda[]): 6 | 12 {
  const total = fontes.reduce((s, f) => s + (f.tipo === 'eventual' ? 0 : f.valorEsperado), 0)
  if (total === 0) return 12
  const fixa = fontes.filter((f) => f.tipo === 'fixa').reduce((s, f) => s + f.valorEsperado, 0)
  return fixa / total >= 0.5 ? 6 : 12
}

export function custoEssencial(
  lancs: Lancamento[], categorias: Categoria[], parcelas: Centavos, mes: Mes,
): Centavos {
  const essenciais = new Set(categorias.filter((c) => c.essencial).map((c) => c.id))
  const meses = [...mesesAnteriores(mes, 3), mes]
  const totais = meses
    .map((m) =>
      lancs.filter((l) => l.tipo === 'saida' && essenciais.has(l.categoriaId) && mesDe(l.data) === m),
    )
    .filter((ls) => ls.length > 0)
    .map((ls) => ls.reduce((s, l) => s + l.valor, 0))
  const base = totais.length === 0 ? 0 : Math.round(media(totais))
  return base + parcelas
}
