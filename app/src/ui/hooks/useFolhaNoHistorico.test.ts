// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useFolhaNoHistorico } from './useFolhaNoHistorico'

// Descarga determinística: timers de 0 ms disparam na ordem em que foram criados, então este roda DEPOIS do
// setTimeout(0) de limpeza do hook, por mais carregada que esteja a máquina (sem espera fixa em ms).
const esperar = () => new Promise<void>((r) => setTimeout(r, 0))
/** Faz `history.back()` e só retorna depois que o `popstate` correspondente foi entregue. */
const voltarEEsperar = () => {
  const entregue = new Promise<void>((r) => window.addEventListener('popstate', () => r(), { once: true }))
  history.back()
  return entregue
}
const ehFolha = () => (history.state as { folha?: boolean } | null)?.folha === true

afterEach(async () => { await esperar(); vi.restoreAllMocks() })

describe('useFolhaNoHistorico', () => {
  it('ao abrir empilha uma entrada no histórico', async () => {
    const antes = history.length
    const { unmount } = renderHook(() => useFolhaNoHistorico(true, () => {}))
    expect(history.length).toBe(antes + 1)
    expect(ehFolha()).toBe(true)
    unmount()
    await esperar()
  })

  it('fechado não empilha nada', () => {
    const antes = history.length
    renderHook(() => useFolhaNoHistorico(false, () => {}))
    expect(history.length).toBe(antes)
  })

  it('voltar (popstate) fecha a folha', async () => {
    const fechar = vi.fn()
    const { unmount } = renderHook(() => useFolhaNoHistorico(true, fechar))
    await voltarEEsperar()
    await waitFor(() => expect(fechar).toHaveBeenCalledTimes(1))
    unmount()
    await esperar()
  })

  it('fechar por botão/Escape desempilha a entrada, sem chamar fechar de novo', async () => {
    const fechar = vi.fn()
    const { rerender } = renderHook(({ a }) => useFolhaNoHistorico(a, fechar), { initialProps: { a: true } })
    expect(ehFolha()).toBe(true)
    rerender({ a: false })
    await waitFor(() => expect(ehFolha()).toBe(false)) // o history.back da limpeza é assíncrono
    expect(fechar).not.toHaveBeenCalled()
  })

  it('fechar depois de um popstate não desempilha de novo (sem pop duplo)', async () => {
    const voltar = vi.spyOn(history, 'back')
    const { rerender } = renderHook(({ a }) => useFolhaNoHistorico(a, () => {}), { initialProps: { a: true } })
    await voltarEEsperar() // o usuário voltou: a entrada já saiu
    voltar.mockClear()
    rerender({ a: false })
    await esperar()
    expect(voltar).not.toHaveBeenCalled()
  })

  it('se a rota mudou com a folha aberta, não volta a rota para trás', async () => {
    const voltar = vi.spyOn(history, 'back')
    const { rerender } = renderHook(({ a }) => useFolhaNoHistorico(a, () => {}), { initialProps: { a: true } })
    history.pushState({ idx: 9 }, '') // navegação do roteador depois da entrada da folha
    rerender({ a: false })
    await esperar()
    expect(voltar).not.toHaveBeenCalled()
  })

  it('StrictMode (efeito, limpeza, efeito) não fecha a folha nem duplica a entrada', async () => {
    const fechar = vi.fn()
    const antes = history.length
    const a = renderHook(() => useFolhaNoHistorico(true, fechar))
    a.unmount() // limpeza do 1º efeito...
    const b = renderHook(() => useFolhaNoHistorico(true, fechar)) // ...e reabertura imediata
    await esperar()
    expect(fechar).not.toHaveBeenCalled()
    expect(history.length).toBe(antes + 1)
    expect(ehFolha()).toBe(true)
    b.unmount()
    await waitFor(() => expect(ehFolha()).toBe(false))
  })
})
