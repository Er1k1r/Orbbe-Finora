import { useEffect, useMemo, useState } from 'react'
import { HashRouter, Link, Route, Routes, useLocation } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { BarraLateral, Drawer } from './ui/componentes/Drawer'
import { Cabecalho } from './ui/componentes/Cabecalho'
import { Fab } from './ui/componentes/Fab'
import { useDadosAoVivo } from './ui/hooks/useDados'
import { DadosContext } from './ui/hooks/DadosContext'
import { semearCategorias } from './data/seed'
import { db } from './data/db'
import { gerarRecorrentes } from './domain/recorrencia'
import { hojeLocal, mesDe } from './domain/meses'
import Resumo from './ui/telas/Resumo'
import Painel from './ui/telas/Painel'
import Compromissos from './ui/telas/Compromissos'
import Lancamentos from './ui/telas/Lancamentos'
import LancamentoRapido from './ui/telas/LancamentoRapido'
import Onboarding from './ui/telas/Onboarding'
import Contas from './ui/telas/Contas'
import Fontes from './ui/telas/Fontes'
import Categorias from './ui/telas/Categorias'
import Insights from './ui/telas/Insights'
import Backup from './ui/telas/Backup'
import Dividas from './ui/telas/Dividas'
import DividaDetalhe from './ui/telas/DividaDetalhe'
import { appVazio } from './ui/padroes'
import { infoDaRota } from './ui/rotas'
import { pedirPersistencia, type EstadoArmazenamento } from './data/armazenamento'
import TelaAcesso from './ui/telas/Acesso'
import { useConta } from './ui/hooks/useConta'
import { travado } from './data/conta'

function Shell() {
  const [aberto, setAberto] = useState(false)
  // Barra lateral recolhida (computador): escolha salva no aparelho.
  const [recolhida, setRecolhida] = useState(() => { try { return localStorage.getItem('finora.barra') === 'recolhida' } catch { return false } })
  const alternarBarra = () => setRecolhida((r) => {
    try { localStorage.setItem('finora.barra', r ? 'aberta' : 'recolhida') } catch { /* modo privado: vale só nesta sessão */ }
    return !r
  })
  const [mes, setMes] = useState(mesDe(hojeLocal()))
  const [lancando, setLancando] = useState(false)
  const dados = useDadosAoVivo() // única leitura do banco; as telas recebem por DadosContext
  const [armazenamento, setArmazenamento] = useState<EstadoArmazenamento>()
  const [hoje, setHoje] = useState(hojeLocal()) // dia local; muda ao voltar para o app em outro dia/mês
  const { pathname } = useLocation()
  const rota = infoDaRota(pathname) // o seletor de mês só aparece onde o mês importa
  // Largura por tela: o painel usa o espaço do computador; o resumo vira duas colunas; o resto fica estreito e centralizado.
  const estreita = ['/fontes', '/categorias', '/backup'].includes(pathname) // formulários longos ficam numa coluna legível
  const largura = estreita ? 'max-w-md md:max-w-2xl' : 'max-w-md md:max-w-3xl xl:max-w-7xl'

  // Troca de rota começa no topo da tela.
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  useEffect(() => { semearCategorias().catch((e) => console.error('semearCategorias', e)) }, [])
  // Pede armazenamento persistente uma vez; o estado vai pelo contexto para a tela de Backup.
  useEffect(() => { void pedirPersistencia().then(setArmazenamento) }, [])
  // App aberto por dias: ao voltar (foco / aba visível) relê o dia local; se o mês virou, o efeito abaixo gera as cópias novas.
  useEffect(() => {
    const atualizar = () => setHoje(hojeLocal())
    window.addEventListener('focus', atualizar)
    document.addEventListener('visibilitychange', atualizar)
    return () => { window.removeEventListener('focus', atualizar); document.removeEventListener('visibilitychange', atualizar) }
  }, [])
  // Roda na abertura, quando o mês local muda e após qualquer mudança dos lançamentos (inclusive logo depois de
  // `importar`, que troca o banco inteiro). É idempotente: sem nada a gerar, `gerarRecorrentes` devolve vazio e o efeito sai.
  useEffect(() => {
    if (!dados.pronto) return
    const { copias, modelos } = gerarRecorrentes(dados.lancamentos, hoje)
    if (copias.length === 0 && modelos.length === 0) return
    // Uma transação com bulkPut: modelos (geradoAte avançado) e cópias juntos. Ids determinísticos
    // tornam o efeito duplicado do StrictMode (e duas abas) inofensivo.
    db.transaction('rw', db.lancamentos, () => db.lancamentos.bulkPut([...modelos, ...copias]))
      .catch((e) => console.error('gerarRecorrentes', e))
  }, [dados.pronto, dados.lancamentos, hoje.slice(0, 7)]) // eslint-disable-line react-hooks/exhaustive-deps

  const valor = useMemo(
    () => ({ ...dados, armazenamento, mes, setMes }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dados.pronto, dados.contas, dados.fontes, dados.categorias, dados.lancamentos, dados.financiamentos, dados.planos, armazenamento, mes],
  )

  if (!dados.pronto) return null
  // Onboarding só num app realmente vazio; com dados mas sem conta, o app abre com um aviso para cadastrar uma.
  const emOnboarding = appVazio(dados)
  const semConta = !emOnboarding && dados.contas.length === 0
  // Telas são plugadas nas tarefas 9–12; rotas já declaradas aqui apontam para elas.
  return (
    <DadosContext.Provider value={valor}>
    <div className="min-h-[100dvh] pb-28 lg:pb-12">
      <div className="ambiente" aria-hidden><i /><i /><i /></div>
      <BarraLateral recolhida={recolhida} alternar={alternarBarra} />
      <div className={`transition-[padding] duration-300 ease-[var(--ease)] ${recolhida ? 'lg:pl-20' : 'lg:pl-64'}`}>
      <div className={`mx-auto lg:px-6 ${estreita ? 'lg:max-w-2xl' : 'lg:max-w-7xl'}`}>
        <Cabecalho mes={mes} setMes={setMes} mostraMes={rota.mostraMes} titulo={rota.titulo} semana={pathname === '/'} virar={pathname !== '/painel'}
          abrirMenu={() => setAberto(true)} menuAberto={aberto} />
      </div>
      <main className={`mx-auto px-4 pt-5 lg:px-6 ${largura}`}>
      {semConta && (
        <Link to="/contas" className="mb-4 grid min-h-11 place-items-center rounded-xl bg-[var(--amarelo-bg)] px-3 text-sm font-semibold text-[var(--texto)]">Cadastre uma conta para continuar</Link>
      )}
      {emOnboarding ? <Onboarding /> : (
      <Routes>
        <Route path="/" element={<Resumo mes={mes} abrirLancamento={() => setLancando(true)} />} />
        <Route path="/painel" element={<Painel mes={mes} />} />
        <Route path="/compromissos" element={<Compromissos mes={mes} />} />
        <Route path="/lancamentos" element={<Lancamentos mes={mes} abrirLancamento={() => setLancando(true)} />} />
        <Route path="/contas" element={<Contas />} />
        <Route path="/fontes" element={<Fontes />} />
        <Route path="/categorias" element={<Categorias />} />
        <Route path="/dividas" element={<Dividas mes={mes} />} />
        <Route path="/dividas/:id" element={<DividaDetalhe mes={mes} />} />
        <Route path="/insights" element={<Insights mes={mes} />} />
        <Route path="/backup" element={<Backup />} />
        <Route path="*" element={<div>Em construção</div>} />
      </Routes>
      )}
      </main>
      </div>
      {!emOnboarding && <Fab onClick={() => setLancando(true)} />}
      <Drawer aberto={aberto} fechar={() => setAberto(false)} />
      {lancando && !emOnboarding && <LancamentoRapido fechar={() => setLancando(false)} />}
    </div>
    </DadosContext.Provider>
  )
}

/**
 * Trava local: só aparece quando já existe conta e a pessoa saiu. Sem conta, o app abre direto (onboarding ou dados
 * existentes); a conta é criada depois, pelo Backup. A senha não criptografa os dados, só trava a abertura.
 */
function Portao() {
  const conta = useConta()
  return travado(conta) ? <TelaAcesso modo="entrar" /> : <Shell />
}

export default function App() {
  return <MotionConfig reducedMotion="user"><HashRouter><Portao /></HashRouter></MotionConfig>
}
