/**
 * Conta local (cadastro e entrada) sem servidor: o aparelho guarda nome, e-mail, sal e o hash PBKDF2-SHA256 da senha,
 * nunca a senha. A senha só trava a abertura do app; os dados no IndexedDB NÃO são criptografados (fora do escopo):
 * quem tiver acesso ao navegador consegue lê-los pelas ferramentas de desenvolvedor.
 */

/** Iterações do PBKDF2 (o registro guarda o número usado, para poder subir no futuro sem quebrar contas antigas). */
export const ITERACOES = 210_000
const BYTES_SAL = 16
const BITS_HASH = 256
export const SENHA_MINIMA = 6

export interface RegistroConta {
  versao: 1
  nome: string
  email: string
  sal: string // base64
  hash: string // base64
  iteracoes: number
}

export interface DadosCadastro { nome: string; email: string; senha: string; confirmar: string }
export type ErrosCadastro = Partial<Record<keyof DadosCadastro, string>>

export const normalizarEmail = (e: string) => e.trim().toLowerCase()
export const inicial = (nome: string) => nome.trim().charAt(0).toLocaleUpperCase('pt-BR') || '?'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function erroEmail(email: string): string | undefined {
  const e = normalizarEmail(email)
  if (!e) return 'Informe seu e-mail.'
  if (!EMAIL.test(e)) return 'Esse e-mail não parece certo.'
  return undefined
}

/** Erros por campo (objeto vazio = pode cadastrar). */
export function validarCadastro(d: DadosCadastro): ErrosCadastro {
  const erros: ErrosCadastro = {}
  if (!d.nome.trim()) erros.nome = 'Informe seu nome.'
  const email = erroEmail(d.email)
  if (email) erros.email = email
  if (d.senha.length < SENHA_MINIMA) erros.senha = `A senha precisa de pelo menos ${SENHA_MINIMA} caracteres.`
  else if (d.confirmar !== d.senha) erros.confirmar = 'As senhas não são iguais.'
  return erros
}

export function validarEntrada(d: { email: string; senha: string }): Partial<Record<'email' | 'senha', string>> {
  const erros: Partial<Record<'email' | 'senha', string>> = {}
  if (!normalizarEmail(d.email)) erros.email = 'Informe seu e-mail.'
  if (!d.senha) erros.senha = 'Informe sua senha.'
  return erros
}

const paraBase64 = (b: Uint8Array) => btoa(String.fromCharCode(...b))
const deBase64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

async function derivar(senha: string, sal: Uint8Array, iteracoes: number): Promise<Uint8Array> {
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal as BufferSource, iterations: iteracoes }, chave, BITS_HASH)
  return new Uint8Array(bits)
}

export async function criarRegistro(nome: string, email: string, senha: string, iteracoes = ITERACOES): Promise<RegistroConta> {
  const sal = crypto.getRandomValues(new Uint8Array(BYTES_SAL))
  const hash = await derivar(senha, sal, iteracoes)
  return { versao: 1, nome: nome.trim(), email: normalizarEmail(email), sal: paraBase64(sal), hash: paraBase64(hash), iteracoes }
}

/** Confere e-mail e senha. Compara o hash inteiro sem sair no primeiro byte diferente. */
export async function conferirSenha(r: RegistroConta, email: string, senha: string): Promise<boolean> {
  const calculado = await derivar(senha, deBase64(r.sal), r.iteracoes)
  const guardado = deBase64(r.hash)
  let dif = calculado.length ^ guardado.length
  for (let i = 0; i < Math.min(calculado.length, guardado.length); i++) dif |= calculado[i] ^ guardado[i]
  return dif === 0 && normalizarEmail(email) === r.email
}
