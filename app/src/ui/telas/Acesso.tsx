/**
 * Cadastro e entrada locais (sem servidor). Trava só a abertura do app neste aparelho: os dados NÃO são criptografados.
 * - "entrar": tela de bloqueio quando já existe conta e a sessão foi encerrada com "Sair".
 * - "criar": aberta pelo Backup ("Criar conta para proteger o app"); nunca é imposta a quem já tem dados.
 */
import { useEffect, useId, useRef, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { Eye, EyeSlash, LockSimple, WarningCircle } from '@phosphor-icons/react'
import { Moldura } from '../componentes/Moldura'
import { Marca } from '../componentes/Drawer'
import { BotaoTema } from '../componentes/BotaoTema'
import { useConta } from '../hooks/useConta'
import { salvarPrefs } from '../hooks/usePreferencias'
import { apagarContaEDados, cadastrar, entrar } from '../../data/conta'
import { SENHA_MINIMA, validarCadastro, validarEntrada, type ErrosCadastro } from '../../domain/acesso'

type Modo = 'criar' | 'entrar' | 'esqueci'
const PALAVRA_APAGAR = 'APAGAR'

const CAMPO = 'min-h-11 w-full rounded-xl bg-[var(--casca)] px-3 text-base'
const BOTAO = 'min-h-12 w-full rounded-full bg-marca font-semibold text-white disabled:opacity-60'
const LINK = 'min-h-11 px-2 text-sm font-semibold text-marca-texto'

function Erro({ id, texto }: { id: string; texto?: string }) {
  if (!texto) return null
  return <p id={id} className="flex items-center gap-1.5 text-sm text-negativo"><WarningCircle size={18} weight="bold" className="shrink-0" />{texto}</p>
}

/** Campo com rótulo visível, dica opcional e erro ligado por aria-describedby. */
function Campo({ rotulo, erro, dica, entradaRef, acessorio, ...props }: InputHTMLAttributes<HTMLInputElement> & {
  rotulo: string; erro?: string; dica?: string; entradaRef?: React.Ref<HTMLInputElement>; acessorio?: React.ReactNode
}) {
  const id = useId()
  const descritores = [dica && `${id}-dica`, erro && `${id}-erro`].filter(Boolean).join(' ') || undefined
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-sm font-semibold">{rotulo}</label>
      <div className="relative">
        <input id={id} ref={entradaRef} aria-invalid={erro ? true : undefined} aria-describedby={descritores}
          className={`${CAMPO} ${acessorio ? 'pr-12' : ''}`} {...props} />
        {acessorio && <span className="absolute inset-y-0 right-0 grid place-items-center">{acessorio}</span>}
      </div>
      {dica && <p id={`${id}-dica`} className="text-xs text-suave">{dica}</p>}
      <Erro id={`${id}-erro`} texto={erro} />
    </div>
  )
}

function BotaoVerSenha({ visivel, alternar }: { visivel: boolean; alternar: () => void }) {
  return (
    <button type="button" onClick={alternar} aria-pressed={visivel} aria-label={visivel ? 'Esconder senha' : 'Mostrar senha'}
      title={visivel ? 'Esconder senha' : 'Mostrar senha'} className="grid size-11 place-items-center rounded-xl text-suave">
      {visivel ? <EyeSlash size={22} /> : <Eye size={22} />}
    </button>
  )
}

function FormCriar({ aoCancelar }: { aoCancelar?: () => void }) {
  const [d, setD] = useState({ nome: '', email: '', senha: '', confirmar: '' })
  const [erros, setErros] = useState<ErrosCadastro>({})
  const [ver, setVer] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [falha, setFalha] = useState('')
  const refNome = useRef<HTMLInputElement>(null)
  const refEmail = useRef<HTMLInputElement>(null)
  const refSenha = useRef<HTMLInputElement>(null)
  const refConfirmar = useRef<HTMLInputElement>(null)
  const mudar = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement>) => setD({ ...d, [k]: e.target.value })

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const novos = validarCadastro(d)
    setErros(novos)
    const primeiro = (['nome', 'email', 'senha', 'confirmar'] as const).find((k) => novos[k])
    if (primeiro) { ({ nome: refNome, email: refEmail, senha: refSenha, confirmar: refConfirmar })[primeiro].current?.focus(); return }
    setSalvando(true)
    try { await cadastrar(d.nome, d.email, d.senha) } catch { setFalha('Não deu para salvar a conta neste navegador. Tente fora da janela anônima.'); setSalvando(false) }
  }

  return (
    <form noValidate onSubmit={enviar} className="grid gap-4">
      <Campo rotulo="Nome" autoComplete="name" value={d.nome} onChange={mudar('nome')} erro={erros.nome} entradaRef={refNome} autoFocus />
      <Campo rotulo="E-mail" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
        value={d.email} onChange={mudar('email')} erro={erros.email} entradaRef={refEmail} />
      <Campo rotulo="Senha" type={ver ? 'text' : 'password'} autoComplete="new-password" value={d.senha} onChange={mudar('senha')}
        dica={`Mínimo de ${SENHA_MINIMA} caracteres.`} erro={erros.senha} entradaRef={refSenha}
        acessorio={<BotaoVerSenha visivel={ver} alternar={() => setVer(!ver)} />} />
      <Campo rotulo="Confirmar senha" type={ver ? 'text' : 'password'} autoComplete="new-password" value={d.confirmar}
        onChange={mudar('confirmar')} erro={erros.confirmar} entradaRef={refConfirmar} />
      {falha && <p role="alert" className="text-sm text-negativo">{falha}</p>}
      <button type="submit" disabled={salvando} className={`${BOTAO} mt-1`}>{salvando ? 'Criando…' : 'Criar conta'}</button>
      {aoCancelar && <button type="button" onClick={aoCancelar} className={LINK}>Agora não</button>}
    </form>
  )
}

function FormEntrar({ emailSalvo, esqueci }: { emailSalvo: string; esqueci: () => void }) {
  const [email, setEmail] = useState(emailSalvo)
  const [senha, setSenha] = useState('')
  const [ver, setVer] = useState(false)
  const [erros, setErros] = useState<Partial<Record<'email' | 'senha', string>>>({})
  const [falha, setFalha] = useState('')
  const [conferindo, setConferindo] = useState(false)
  const refEmail = useRef<HTMLInputElement>(null)
  const refSenha = useRef<HTMLInputElement>(null)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setFalha('')
    const novos = validarEntrada({ email, senha })
    setErros(novos)
    if (novos.email) { refEmail.current?.focus(); return }
    if (novos.senha) { refSenha.current?.focus(); return }
    setConferindo(true)
    const ok = await entrar(email, senha)
    if (ok) return // a trava some; esta tela desmonta
    setConferindo(false)
    setSenha('')
    setFalha('E-mail ou senha incorretos.')
    refSenha.current?.focus()
  }

  return (
    <form noValidate onSubmit={enviar} className="grid gap-4">
      <Campo rotulo="E-mail" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false}
        value={email} onChange={(e) => setEmail(e.target.value)} erro={erros.email} entradaRef={refEmail} />
      <Campo rotulo="Senha" type={ver ? 'text' : 'password'} autoComplete="current-password" value={senha}
        onChange={(e) => setSenha(e.target.value)} erro={erros.senha} entradaRef={refSenha} autoFocus={!!emailSalvo}
        acessorio={<BotaoVerSenha visivel={ver} alternar={() => setVer(!ver)} />} />
      {falha && <p role="alert" className="flex items-center gap-1.5 text-sm font-semibold text-negativo"><WarningCircle size={18} weight="bold" className="shrink-0" />{falha}</p>}
      <button type="submit" disabled={conferindo} className={`${BOTAO} mt-1`}>{conferindo ? 'Entrando…' : 'Entrar'}</button>
      <button type="button" onClick={esqueci} className={LINK}>Esqueci a senha</button>
    </form>
  )
}

function Esqueci({ voltar }: { voltar: () => void }) {
  const [texto, setTexto] = useState('')
  const [apagando, setApagando] = useState(false)
  const confere = texto.trim().toUpperCase() === PALAVRA_APAGAR

  async function apagar(e: FormEvent) {
    e.preventDefault()
    if (!confere) return
    setApagando(true)
    await apagarContaEDados()
    salvarPrefs({ objetivos: [], checklistFechado: false, semFinanciamento: false, contaPadraoId: undefined })
  }

  return (
    <form noValidate onSubmit={apagar} className="grid gap-4 text-sm">
      <p>Sua conta existe só neste aparelho e o Finora não tem servidor, então <strong>não dá para recuperar a senha</strong>.</p>
      <p>O que dá para fazer: apagar a conta e todos os dados deste aparelho e começar de novo. Se você tem um arquivo de backup, depois toque em <strong>Já uso · Restaurar backup</strong> na tela inicial.</p>
      <Campo rotulo={`Para confirmar, digite ${PALAVRA_APAGAR}`} value={texto} onChange={(e) => setTexto(e.target.value)}
        autoComplete="off" autoCapitalize="characters" spellCheck={false} autoFocus />
      <button type="submit" disabled={!confere || apagando}
        className="min-h-12 w-full rounded-full border-2 border-[var(--vermelho-texto)] font-semibold text-negativo disabled:opacity-50">
        {apagando ? 'Apagando…' : 'Apagar conta e dados deste aparelho'}
      </button>
      <button type="button" onClick={voltar} className={LINK}>Voltar para entrar</button>
    </form>
  )
}

const TITULOS: Record<Modo, { titulo: string; texto: string }> = {
  criar: { titulo: 'Criar conta', texto: 'A senha trava o app neste aparelho. Ela não pode ser recuperada, então guarde bem e faça backups.' },
  entrar: { titulo: 'Entrar', texto: 'Digite sua senha para abrir o app.' },
  esqueci: { titulo: 'Esqueci a senha', texto: 'Sem servidor, sem recuperação. Veja o que dá para fazer.' },
}

export default function TelaAcesso({ modo: inicial, aoFechar }: { modo: 'criar' | 'entrar'; aoFechar?: () => void }) {
  const [modo, setModo] = useState<Modo>(inicial)
  const { conta } = useConta()
  const idTitulo = useId()
  const t = TITULOS[modo]

  // Aberta por cima do app (Backup): Esc fecha e a página de trás não rola.
  useEffect(() => {
    if (!aoFechar) return
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar() }
    document.addEventListener('keydown', tecla)
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', tecla); document.body.style.overflow = antes }
  }, [aoFechar])

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto" role={aoFechar ? 'dialog' : undefined} aria-modal={aoFechar ? true : undefined} aria-labelledby={idTitulo}>
      <div className="ambiente" aria-hidden><i /><i /><i /></div>
      <div className="absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))]"><BotaoTema /></div>
      <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-6 px-4 pb-10 pt-[calc(4rem+env(safe-area-inset-top))] md:py-16">
        <p className="text-center text-[40px]"><Marca /></p>
        <Moldura preenchimento="p-5 md:p-8">
          <h1 id={idTitulo} className="text-2xl font-extrabold leading-tight">{t.titulo}</h1>
          <p className="mb-5 mt-1 text-sm text-suave">{t.texto}</p>
          {modo === 'criar' && <FormCriar aoCancelar={aoFechar} />}
          {modo === 'entrar' && <FormEntrar emailSalvo={conta?.email ?? ''} esqueci={() => setModo('esqueci')} />}
          {modo === 'esqueci' && <Esqueci voltar={() => setModo('entrar')} />}
        </Moldura>
        <p className="flex items-center justify-center gap-2 text-center text-xs text-suave">
          <LockSimple size={16} className="shrink-0" />A conta fica só neste aparelho. Nada vai para a internet.
        </p>
      </main>
    </div>
  )
}
