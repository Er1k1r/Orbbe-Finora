import { useEffect, useRef } from 'react'

let ativas = 0 // folhas abertas agora (a entrada do histórico é compartilhada)

const ehFolha = () => (history.state as { folha?: boolean } | null)?.folha === true

/**
 * Botão Voltar do Android fecha a folha (menu, lançamento rápido, formulários) em vez de sair da tela.
 * Ao abrir empilha uma entrada (`history.pushState`); `popstate` fecha. Fechando por botão/Escape a entrada
 * é desempilhada, mas só se ainda for o topo e só uma vez (o `popstate` já a tirou; o roteador pode ter
 * empilhado outra rota por cima). A limpeza é adiada um tick para o StrictMode (limpa e reabre) não
 * desempilhar a entrada que o novo efeito acabou de reaproveitar.
 */
export function useFolhaNoHistorico(aberto: boolean, fechar: () => void): void {
  const aoFechar = useRef(fechar)
  useEffect(() => { aoFechar.current = fechar })
  useEffect(() => {
    if (!aberto) return
    ativas += 1
    if (!ehFolha()) history.pushState({ folha: true }, '')
    const aoVoltar = () => aoFechar.current()
    window.addEventListener('popstate', aoVoltar)
    return () => {
      window.removeEventListener('popstate', aoVoltar)
      ativas -= 1
      setTimeout(() => { if (ativas === 0 && ehFolha()) history.back() }, 0)
    }
  }, [aberto])
}
