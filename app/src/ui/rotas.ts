/** O que o cabeçalho mostra no centro por rota: o seletor de mês (quando o mês importa) ou o título da tela. */
export interface InfoRota { titulo: string; mostraMes: boolean }

const SEM_MES: Record<string, string> = {
  '/contas': 'Contas', '/fontes': 'Fontes de renda', '/categorias': 'Categorias', '/backup': 'Backup',
}

/** `pathname` do roteador. Rotas fora da lista (e desconhecidas) mantêm o seletor de mês. */
export function infoDaRota(pathname: string): InfoRota {
  const caminho = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  const titulo = SEM_MES[caminho]
  return titulo === undefined ? { titulo: '', mostraMes: true } : { titulo, mostraMes: false }
}
