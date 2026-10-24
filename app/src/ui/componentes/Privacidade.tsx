import { CheckCircle, Lock } from '@phosphor-icons/react'

export function Privacidade() {
  return (
    <ul className="grid gap-3 rounded-2xl bg-[var(--casca)] p-4 text-sm">
      <li className="flex gap-3"><Lock size={22} weight="light" className="shrink-0 text-marca-texto" />Nada sai do seu celular: o app não envia seus dados para lugar nenhum.</li>
      <li className="flex gap-3"><CheckCircle size={22} weight="light" className="shrink-0 text-marca-texto" />Faça um backup de vez em quando para não perder nada ao trocar de aparelho.</li>
    </ul>
  )
}
