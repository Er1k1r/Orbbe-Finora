import { describe, expect, it } from 'vitest'
import { conferirSenha, criarRegistro, inicial, ITERACOES, normalizarEmail, validarCadastro, validarEntrada } from './acesso'

const ok = { nome: 'Ana Souza', email: 'ana@exemplo.com', senha: 'segredo1', confirmar: 'segredo1' }

describe('validarCadastro', () => {
  it('aceita um cadastro completo', () => {
    expect(validarCadastro(ok)).toEqual({})
  })
  it('pede nome, e-mail e senha', () => {
    const e = validarCadastro({ nome: '  ', email: '', senha: '', confirmar: '' })
    expect(e.nome).toBe('Informe seu nome.')
    expect(e.email).toBe('Informe seu e-mail.')
    expect(e.senha).toBe('A senha precisa de pelo menos 6 caracteres.')
  })
  it('recusa e-mail sem formato de e-mail', () => {
    expect(validarCadastro({ ...ok, email: 'ana.exemplo.com' }).email).toBe('Esse e-mail não parece certo.')
    expect(validarCadastro({ ...ok, email: 'ana@exemplo' }).email).toBe('Esse e-mail não parece certo.')
  })
  it('senha com menos de 6 caracteres', () => {
    expect(validarCadastro({ ...ok, senha: '12345', confirmar: '12345' }).senha).toBe('A senha precisa de pelo menos 6 caracteres.')
    expect(validarCadastro({ ...ok, senha: '123456', confirmar: '123456' }).senha).toBeUndefined()
  })
  it('confirmação diferente', () => {
    expect(validarCadastro({ ...ok, confirmar: 'outra1' }).confirmar).toBe('As senhas não são iguais.')
  })
})

describe('validarEntrada', () => {
  it('pede e-mail e senha', () => {
    expect(validarEntrada({ email: '', senha: '' })).toEqual({ email: 'Informe seu e-mail.', senha: 'Informe sua senha.' })
    expect(validarEntrada({ email: 'a@b.co', senha: 'x' })).toEqual({})
  })
})

describe('normalizarEmail e inicial', () => {
  it('e-mail sem espaços e em minúsculas', () => {
    expect(normalizarEmail('  Ana@Exemplo.COM ')).toBe('ana@exemplo.com')
  })
  it('inicial do nome', () => {
    expect(inicial(' ana souza')).toBe('A')
    expect(inicial('')).toBe('?')
  })
})

describe('criarRegistro e conferirSenha (PBKDF2-SHA256)', () => {
  it('guarda sal e hash, nunca a senha', async () => {
    const r = await criarRegistro(ok.nome, ' Ana@Exemplo.com ', ok.senha, 1000)
    expect(r.nome).toBe('Ana Souza')
    expect(r.email).toBe('ana@exemplo.com')
    expect(r.iteracoes).toBe(1000)
    expect(atob(r.sal)).toHaveLength(16)
    expect(atob(r.hash)).toHaveLength(32)
    expect(JSON.stringify(r)).not.toContain(ok.senha)
  })
  it('sal aleatório: a mesma senha gera hashes diferentes', async () => {
    const a = await criarRegistro('A', 'a@b.co', 'segredo1', 1000)
    const b = await criarRegistro('A', 'a@b.co', 'segredo1', 1000)
    expect(a.sal).not.toBe(b.sal)
    expect(a.hash).not.toBe(b.hash)
  })
  it('confere a senha certa e recusa a errada ou outro e-mail', async () => {
    const r = await criarRegistro('A', 'a@b.co', 'segredo1', 1000)
    expect(await conferirSenha(r, 'A@B.co ', 'segredo1')).toBe(true)
    expect(await conferirSenha(r, 'a@b.co', 'segredo2')).toBe(false)
    expect(await conferirSenha(r, 'x@b.co', 'segredo1')).toBe(false)
  })
  it('padrão de iterações é de pelo menos 150 mil', () => {
    expect(ITERACOES).toBeGreaterThanOrEqual(150_000)
  })
})
