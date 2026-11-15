// oxlint-disable react/only-export-components -- ajuda de teste, sem fast refresh
/** Ajudas para testes de componente (jsdom): provê o DadosContext como o Shell faz, sobre o IndexedDB falso. */
import { useMemo, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { db } from './data/db'
import { DadosContext } from './ui/hooks/DadosContext'
import { useDadosAoVivo } from './ui/hooks/useDados'

function Provedor({ mes, children }: { mes: string; children: ReactNode }) {
  const dados = useDadosAoVivo()
  const valor = useMemo(() => ({ ...dados, mes, setMes: () => {} }), [dados, mes])
  return dados.pronto ? <DadosContext.Provider value={valor}>{children}</DadosContext.Provider> : null
}

export const comDados = (mes: string, children: ReactNode, rota = '/') => (
  <MemoryRouter initialEntries={[rota]}><Provedor mes={mes}>{children}</Provedor></MemoryRouter>
)

export async function limparBanco() { await db.delete(); await db.open() }
