import { useState } from 'react'
import { Moon, Sun } from '@phosphor-icons/react'
import { escolherTema, temaAtual } from '../tema'

export function BotaoTema() {
  const [tema, setTema] = useState(temaAtual())
  const alternar = () => { const novo = tema === 'escuro' ? 'claro' : 'escuro'; escolherTema(novo); setTema(novo) }
  return (
    <button aria-label={tema === 'escuro' ? 'Usar tema claro' : 'Usar tema escuro'} onClick={alternar} className="size-11 grid place-items-center">
      {tema === 'escuro' ? <Sun size={22} weight="light" /> : <Moon size={22} weight="light" />}
    </button>
  )
}
