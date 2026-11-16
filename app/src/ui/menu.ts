/** Itens do menu (gaveta do celular e barra lateral do computador). */
import { SquaresFour, House, Bank, Receipt, Scales, Lightbulb, Tag, Briefcase, FloppyDisk } from '@phosphor-icons/react'

export const ITENS = [
  { para: '/', rotulo: 'Resumo', Icone: House },
  { para: '/painel', rotulo: 'Painel', Icone: SquaresFour },
  { para: '/contas', rotulo: 'Contas', Icone: Bank },
  { para: '/lancamentos', rotulo: 'Lançamentos', Icone: Receipt },
  { para: '/dividas', rotulo: 'Dívidas', Icone: Scales },
  { secao: 'Analisar' },
  { para: '/insights', rotulo: 'Insights e reserva', Icone: Lightbulb },
  { para: '/categorias', rotulo: 'Categorias', Icone: Tag },
  { secao: 'Configurar' },
  { para: '/fontes', rotulo: 'Fontes de renda', Icone: Briefcase },
  { para: '/backup', rotulo: 'Backup', Icone: FloppyDisk },
] as const
