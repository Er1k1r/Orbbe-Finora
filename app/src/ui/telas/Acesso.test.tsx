// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { db } from '../../data/db'
import { exportar } from '../../data/backup'
import { CHAVE_CONTA, CHAVE_SESSAO, recarregarConta } from '../../data/conta'
import { criarRegistro } from '../../domain/acesso'
import { limparBanco } from '../../test-ui'

vi.mock('../../domain/acesso', async (original) => {
  const m = await original<typeof import('../../domain/acesso')>()
  // Iterações baixas só nos testes de tela (o padrão real é testado em acesso.test.ts).
  return { ...m, criarRegistro: (n: string, e: string, s: string) => m.criarRegistro(n, e, s, 1000) }
})

async function contaSalva(sessaoAberta: boolean) {
  localStorage.setItem(CHAVE_CONTA, JSON.stringify(await criarRegistro('Ana Souza', 'ana@exemplo.com', 'segredo1')))
  if (sessaoAberta) localStorage.setItem(CHAVE_SESSAO, 'aberta')
  recarregarConta()
}

function abrir(rota = '#/') {
  window.location.hash = rota
  render(<App />)
}

const digitar = (rotulo: string | RegExp, valor: string) => fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } })

beforeEach(async () => {
  vi.stubGlobal('scrollTo', () => {})
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  await limparBanco()
  localStorage.clear()
  recarregarConta() // zera o cache da conta entre testes
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.location.hash = ''; localStorage.clear(); recarregarConta() })

describe('Conta local: segundo plano', () => {
  it('com dados e sem conta, o app abre direto (sem tela de entrada)', async () => {
    await db.contas.put({ id: 'c1', nome: 'Banco', tipo: 'banco', saldoInicial: 0 })
    abrir()
    expect(await screen.findByRole('banner')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Entrar' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Criar conta' })).toBeNull()
  })

  it('app vazio e sem conta segue para o onboarding', async () => {
    abrir()
    expect(await screen.findByRole('button', { name: 'Montar meu controle' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Entrar' })).toBeNull()
  })

  it('cria a conta pelo Backup: guarda só o hash e mostra o nome no menu', async () => {
    await db.contas.put({ id: 'c1', nome: 'Banco', tipo: 'banco', saldoInicial: 0 })
    abrir('#/backup')
    fireEvent.click(await screen.findByRole('button', { name: 'Criar conta para proteger o app' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Criar conta' })
    // validação: senha curta e confirmação diferente
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Criar conta' }))
    expect(await within(dialogo).findByText('Informe seu nome.')).toBeTruthy()
    digitar('Nome', 'Ana Souza')
    digitar('E-mail', 'Ana@Exemplo.com')
    digitar('Senha', '123')
    digitar('Confirmar senha', '123')
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Criar conta' }))
    expect(await within(dialogo).findByText('A senha precisa de pelo menos 6 caracteres.')).toBeTruthy()
    // mostrar/esconder senha
    const ver = within(dialogo).getByRole('button', { name: 'Mostrar senha' })
    expect(ver.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(ver)
    expect(within(dialogo).getByRole('button', { name: 'Esconder senha' }).getAttribute('aria-pressed')).toBe('true')
    expect((screen.getByLabelText('Senha') as HTMLInputElement).type).toBe('text')

    digitar('Senha', 'segredo1')
    digitar('Confirmar senha', 'segredo1')
    await act(async () => { fireEvent.click(within(dialogo).getByRole('button', { name: 'Criar conta' })) })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    const guardado = localStorage.getItem(CHAVE_CONTA)!
    expect(guardado).not.toContain('segredo1')
    expect(JSON.parse(guardado)).toMatchObject({ nome: 'Ana Souza', email: 'ana@exemplo.com' })
    expect(localStorage.getItem(CHAVE_SESSAO)).toBe('aberta')
    const barra = screen.getByRole('navigation', { name: 'Menu lateral' })
    expect(within(barra).getByText('Ana Souza')).toBeTruthy()
    expect(within(barra).getByRole('button', { name: 'Sair' })).toBeTruthy()
    // o backup não leva o hash nem o sal
    const json = await exportar()
    const reg = JSON.parse(guardado)
    expect(json).not.toContain(reg.hash)
    expect(json).not.toContain(reg.sal)
  })

  it('senha errada: mensagem clara, foco na senha e e-mail mantido', async () => {
    await contaSalva(false)
    abrir()
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeTruthy()
    const email = screen.getByLabelText('E-mail') as HTMLInputElement
    expect(email.value).toBe('ana@exemplo.com')
    digitar('Senha', 'errada1')
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Entrar' })) })
    expect((await screen.findByRole('alert')).textContent).toBe('E-mail ou senha incorretos.')
    const senha = screen.getByLabelText('Senha') as HTMLInputElement
    expect(document.activeElement).toBe(senha)
    expect(senha.value).toBe('')
    expect(email.value).toBe('ana@exemplo.com')
    expect(screen.queryByRole('banner')).toBeNull()
  })

  it('senha certa abre o app e a sessão sobrevive à recarga', async () => {
    await db.contas.put({ id: 'c1', nome: 'Banco', tipo: 'banco', saldoInicial: 0 })
    await contaSalva(false)
    abrir()
    await screen.findByLabelText('Senha')
    digitar('Senha', 'segredo1')
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Entrar' })) })
    expect(await screen.findByRole('banner')).toBeTruthy()
    expect(localStorage.getItem(CHAVE_SESSAO)).toBe('aberta')
    cleanup()
    abrir()
    expect(await screen.findByRole('banner')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Entrar' })).toBeNull()
  })

  it('Sair no menu trava o app de novo', async () => {
    await db.contas.put({ id: 'c1', nome: 'Banco', tipo: 'banco', saldoInicial: 0 })
    await contaSalva(true)
    abrir()
    const barra = await screen.findByRole('navigation', { name: 'Menu lateral' })
    expect(within(barra).getByText('Ana Souza')).toBeTruthy()
    fireEvent.click(within(barra).getByRole('button', { name: 'Sair' }))
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeTruthy()
    expect(screen.queryByRole('banner')).toBeNull()
    expect(localStorage.getItem(CHAVE_SESSAO)).toBeNull()
    expect(localStorage.getItem(CHAVE_CONTA)).not.toBeNull()
  })

  it('Esqueci a senha: explica, pede APAGAR e volta ao onboarding sem conta nem dados', async () => {
    await db.contas.put({ id: 'c1', nome: 'Banco', tipo: 'banco', saldoInicial: 0 })
    await contaSalva(false)
    abrir()
    fireEvent.click(await screen.findByRole('button', { name: 'Esqueci a senha' }))
    expect(screen.getByText(/não dá para recuperar a senha/)).toBeTruthy()
    const apagar = screen.getByRole('button', { name: 'Apagar conta e dados deste aparelho' }) as HTMLButtonElement
    expect(apagar.disabled).toBe(true)
    digitar('Para confirmar, digite APAGAR', 'apagar')
    expect(apagar.disabled).toBe(false)
    await act(async () => { fireEvent.click(apagar) })
    expect(await screen.findByRole('button', { name: 'Montar meu controle' })).toBeTruthy()
    expect(await db.contas.count()).toBe(0)
    expect(localStorage.getItem(CHAVE_CONTA)).toBeNull()
  })
})
