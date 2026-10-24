import type { ComponentType } from 'react'
import {
  ArrowsLeftRight, Bag, Bank, Bus, ChartLineUp, DotsThree, ForkKnife, FilmSlate, GasPump, GraduationCap, Hammer,
  Heartbeat, House, Lightning, Scales, ShoppingCart, Storefront, TrendUp, Wallet,
} from '@phosphor-icons/react'

type IconeFn = ComponentType<{ size?: number; weight?: 'light' }>

// Mapa explícito (e não `import * as Ph`): o import em bloco derrubaria o tree-shaking e levaria
// as ~1.500 famílias de ícones para o bundle (5 MB; o build do PWA falha acima de 2 MiB de precache).
// Para usar um ícone novo numa categoria, adicione-o aqui.
const ICONES: Record<string, IconeFn> = {
  ArrowsLeftRight, Bag, Bank, Bus, ChartLineUp, DotsThree, ForkKnife, FilmSlate, GasPump, GraduationCap, Hammer,
  Heartbeat, House, Lightning, Scales, ShoppingCart, Storefront, TrendUp, Wallet,
}

/** Mapeia o nome de ícone salvo na categoria para o componente Phosphor (padrão: três pontos). */
export function Icone({ nome, size = 24 }: { nome: string; size?: number }) {
  const C = ICONES[nome] ?? DotsThree
  return <C size={size} weight="light" />
}
