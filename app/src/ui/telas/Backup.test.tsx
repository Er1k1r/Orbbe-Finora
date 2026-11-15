// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Backup from './Backup'
import { db } from '../../data/db'
import * as backup from '../../data/backup'
import { salvarPrefs } from '../hooks/usePreferencias'
import { comDados, limparBanco } from '../../test-ui'

vi.mock('../../data/backup', async (original) => {
  const m = await original<typeof import('../../data/backup')>()
  return { ...m, exportar: vi.fn(m.exportar) }
})

const guardadas = () => JSON.parse(localStorage.getItem('financas.prefs') ?? '{}')
const vazio = { contas: [], fontes: [], categorias: [], lancamentos: [], financiamentos: [], planos: [] }
const conta = { id: 'c1', nome: 'Banco', tipo: 'banco', saldoInicial: 100 }

beforeEach(async () => {
  await limparBanco()
  await db.contas.put({ id: 'velha', nome: 'Antiga', tipo: 'banco', saldoInicial: 5 })
  vi.stubGlobal('confirm', () => true)
  vi.mocked(backup.exportar).mockClear()
  salvarPrefs({ objetivos: ['destino'], checklistFechado: false, semFinanciamento: false, contaPadraoId: 'velha' })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

async function importarArquivo(conteudo: object) {
  render(comDados('2026-10', <Backup />))
  const entrada = await screen.findByLabelText('Arquivo de backup')
  const arquivo = new File([JSON.stringify(conteudo)], 'b.json', { type: 'application/json' })
  Object.defineProperty(arquivo, 'text', { value: () => Promise.resolve(JSON.stringify(conteudo)) }) // jsdom antigo não tem File.text
  await act(async () => { fireEvent.change(entrada, { target: { files: [arquivo] } }) })
  await screen.findByText(/Backup importado\.|inválido|não suportada/)
}

describe('Backup.tsx: preferências', () => {
  it('importar aplica as preferências do arquivo', async () => {
    await importarArquivo({ versao: 3, ...vazio, contas: [conta],
      preferencias: { objetivos: ['meta'], checklistFechado: true, semFinanciamento: true, contaPadraoId: 'c1' } })
    expect(guardadas()).toMatchObject({ objetivos: ['meta'], checklistFechado: true, semFinanciamento: true, contaPadraoId: 'c1' })
    expect((await db.contas.toArray()).map((c) => c.id)).toEqual(['c1'])
  })

  it('arquivo sem contaPadraoId limpa a conta padrão atual', async () => {
    await importarArquivo({ versao: 3, ...vazio, contas: [conta], preferencias: { objetivos: ['meta'] } })
    expect(guardadas().objetivos).toEqual(['meta'])
    expect(guardadas().contaPadraoId).toBeUndefined()
  })

  it('arquivo v2 (sem preferências) não mexe nas preferências atuais', async () => {
    await importarArquivo({ versao: 2, ...vazio, contas: [conta] })
    expect(guardadas()).toMatchObject({ objetivos: ['destino'], contaPadraoId: 'velha' })
  })

  it('importação rejeitada não aplica preferências nem apaga dados', async () => {
    await importarArquivo({ versao: 3, ...vazio, contas: [conta], preferencias: { objetivos: ['meta'], checklistFechado: 'sim' } })
    expect(guardadas().objetivos).toEqual(['destino'])
    expect((await db.contas.toArray()).map((c) => c.id)).toEqual(['velha'])
  })

  it('exportar passa as preferências atuais', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} }))
    render(comDados('2026-10', <Backup />))
    fireEvent.click(await screen.findByRole('button', { name: 'Exportar backup' }))
    await waitFor(() => expect(backup.exportar).toHaveBeenCalledTimes(1))
    expect(vi.mocked(backup.exportar).mock.calls[0][0]).toMatchObject({ objetivos: ['destino'], contaPadraoId: 'velha' })
  })
})
