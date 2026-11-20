/**
 * Conta local guardada no localStorage do aparelho (fora do IndexedDB, então nunca entra no backup JSON).
 * A sessão fica aberta até a pessoa escolher "Sair": sem prazo, vale entre recargas.
 * Lembrete: a trava só protege a abertura do app; os dados NÃO são criptografados.
 */
import { conferirSenha, criarRegistro, type RegistroConta } from '../domain/acesso'
import { db } from './db'

export const CHAVE_CONTA = 'finora.conta'
export const CHAVE_SESSAO = 'finora.sessao'
const CHAVES_DADOS = ['financas.prefs'] // preferências que viajam com os dados (apagadas junto com eles)

export interface EstadoConta { conta: RegistroConta | null; aberta: boolean }

const ouvintes = new Set<() => void>()
let cache: EstadoConta | null = null

function ehRegistro(v: unknown): v is RegistroConta {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return r.versao === 1 && typeof r.nome === 'string' && typeof r.email === 'string' && typeof r.sal === 'string'
    && typeof r.hash === 'string' && typeof r.iteracoes === 'number' && r.iteracoes > 0
}

function ler(): EstadoConta {
  if (cache) return cache
  let conta: RegistroConta | null = null
  let aberta = false
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE_CONTA) ?? 'null')
    conta = ehRegistro(bruto) ? bruto : null
    aberta = localStorage.getItem(CHAVE_SESSAO) === 'aberta'
  } catch { /* localStorage indisponível ou corrompido: sem conta */ }
  cache = { conta, aberta }
  return cache
}

function avisar() { cache = null; ouvintes.forEach((f) => f()) }

/** Relê o localStorage (testes e mudanças feitas fora destas funções). */
export const recarregarConta = avisar

export const estadoConta = ler
export function ouvirConta(f: () => void) {
  ouvintes.add(f)
  // Outra aba saiu ou entrou: esta acompanha.
  const deOutraAba = (e: StorageEvent) => { if (e.key === CHAVE_CONTA || e.key === CHAVE_SESSAO || e.key === null) { cache = null; f() } }
  window.addEventListener('storage', deOutraAba)
  return () => { ouvintes.delete(f); window.removeEventListener('storage', deOutraAba) }
}

/** Precisa mostrar a tela de entrada? Só quando existe conta e a sessão está fechada. */
export const travado = (e: EstadoConta) => e.conta !== null && !e.aberta

export async function cadastrar(nome: string, email: string, senha: string) {
  const registro = await criarRegistro(nome, email, senha)
  localStorage.setItem(CHAVE_CONTA, JSON.stringify(registro))
  localStorage.setItem(CHAVE_SESSAO, 'aberta') // quem acabou de criar a conta já está dentro
  avisar()
}

/** Abre a sessão se e-mail e senha conferem. */
export async function entrar(email: string, senha: string): Promise<boolean> {
  const { conta } = ler()
  if (!conta || !(await conferirSenha(conta, email, senha))) return false
  localStorage.setItem(CHAVE_SESSAO, 'aberta')
  avisar()
  return true
}

export function sair() {
  try { localStorage.removeItem(CHAVE_SESSAO) } catch { /* nada a fazer */ }
  avisar()
}

/** "Esqueci a senha": sem servidor não há recuperação. Apaga a conta e todos os dados deste aparelho. */
export async function apagarContaEDados() {
  await db.transaction('rw', db.tables, async () => { for (const t of db.tables) await t.clear() })
  try { for (const k of [CHAVE_CONTA, CHAVE_SESSAO, ...CHAVES_DADOS]) localStorage.removeItem(k) } catch { /* nada a fazer */ }
  avisar()
}
