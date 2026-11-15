import { useRef, useState } from 'react'
import { Moldura } from '../componentes/Moldura'
import { Privacidade } from '../componentes/Privacidade'
import { useDados } from '../hooks/useDados'
import { exportar, importar } from '../../data/backup'
import { pedirPersistencia, type EstadoArmazenamento } from '../../data/armazenamento'
import { hojeLocal } from '../../domain/meses'
import { salvarPrefs, usePrefs } from '../hooks/usePreferencias'

const TEXTO_ARMAZENAMENTO: Record<EstadoArmazenamento, string> = {
  persistente: 'Armazenamento protegido: o navegador não apaga os dados do app por conta própria.',
  nao_persistente: 'O navegador pode apagar os dados do app se faltar espaço. Faça backup com frequência.',
  indisponivel: 'Este navegador não informa se os dados estão protegidos. Faça backup com frequência.',
}

export default function Backup() {
  const d = useDados()
  const [msg, setMsg] = useState('')
  const [pedido, setPedido] = useState<EstadoArmazenamento>() // resposta de um novo pedido; antes dele vale o do Shell
  const armazenamento = pedido ?? d.armazenamento
  const prefs = usePrefs()
  const arquivo = useRef<HTMLInputElement>(null)

  async function baixar() {
    try {
      const blob = new Blob([await exportar(prefs)], { type: 'application/json' })
      const a = document.createElement('a')
      const url = URL.createObjectURL(blob)
      a.href = url
      a.download = `financas-${hojeLocal()}.json`
      document.body.appendChild(a) // alguns navegadores só baixam com o link no DOM
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 0)
      setMsg('Backup exportado.')
    } catch (e) { setMsg((e as Error).message) }
  }
  async function ler(f: File) {
    if (!confirm('Isso substitui todos os dados atuais. Continuar?')) return
    try {
      const { preferencias } = await importar(await f.text())
      if (preferencias) salvarPrefs({ ...preferencias, contaPadraoId: preferencias.contaPadraoId }) // o arquivo manda: sem conta padrão nele, limpa a atual
      setMsg('Backup importado.')
    }
    catch (e) { setMsg((e as Error).message) }
  }

  return (
    <div className="grid gap-4">
      <Moldura>
        <Privacidade />
        <h3 className="mt-4 text-[10px] uppercase tracking-[0.2em] text-suave">Armazenamento</h3>
        <p role="status" className="mt-1 text-sm">{armazenamento ? TEXTO_ARMAZENAMENTO[armazenamento] : 'Verificando o armazenamento…'}</p>
        {armazenamento === 'nao_persistente' && (
          <button onClick={async () => setPedido(await pedirPersistencia())} className="mt-1 min-h-11 text-sm font-semibold text-marca-texto">
            Pedir proteção de novo
          </button>
        )}
        <button onClick={baixar} className="mt-4 min-h-12 w-full rounded-full bg-marca font-semibold text-white">Exportar backup</button>
        <button onClick={() => arquivo.current?.click()} className="mt-2 min-h-12 w-full rounded-full bg-[var(--casca)] font-semibold">Importar backup</button>
        <input ref={arquivo} type="file" accept=".json,application/json" hidden aria-label="Arquivo de backup"
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void ler(f) }} />
        {msg && <p role="status" className="mt-3 text-sm">{msg}</p>}
      </Moldura>
    </div>
  )
}
