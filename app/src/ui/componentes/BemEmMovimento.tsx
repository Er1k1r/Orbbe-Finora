import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Car, Coins, House, Motorcycle } from '@phosphor-icons/react'
import type { TipoBem } from '../../domain/tipos'

const ICONES = { carro: Car, moto: Motorcycle, casa: House, outro: Coins } as const

const semWebGL = () => typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)

/**
 * Mini cena 3D do bem financiado (carro dando voltas, casa girando...). `pago` é a fração 0–1 do contrato.
 * Sem WebGL (ou nos testes) cai para um ícone; com "reduzir movimento" mostra um quadro parado.
 */
export function BemEmMovimento({ tipo, pago, rotulo }: { tipo: TipoBem; pago: number; rotulo: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [falhou, setFalhou] = useState(semWebGL)

  useEffect(() => {
    if (semWebGL()) return
    let vivo = true
    let soltar: (() => void) | undefined
    const reduzido = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    import('./cena3d')
      .then((m) => {
        if (!vivo || !canvas.current) return
        try { soltar = m.montarCena(canvas.current, { tipo, pago, animar: !reduzido }) } catch { setFalhou(true) }
      })
      .catch(() => setFalhou(true))
    return () => { vivo = false; soltar?.() }
  }, [tipo, pago])

  const Fallback = ICONES[tipo]
  return (
    <motion.div role="img" aria-label={rotulo} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 22 }} whileHover={{ scale: 1.06 }}
      className="grid h-28 w-44 shrink-0 place-items-center">
      {falhou ? <Fallback size={44} weight="light" /> : <canvas ref={canvas} className="h-28 w-44" />}
    </motion.div>
  )
}
