import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { DURACION_ENTRADA_S, DURACION_REDUCED_S, EASE_PREMIUM } from './formularioMotionTokens'

type Props = Readonly<{
  titulo: string
  mensaje?: string
  accion?: ReactNode
}>

/**
 * Empty state conversacional (misma familia visual que PantallaExitoWizard, sin confeti).
 */
export default function EstadoVacioConversacional({ titulo, mensaje, accion }: Props) {
  const reduced = useReducedMotion() ?? false
  return (
    <div className="px-2 py-10 text-center">
      <motion.div
        className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-hc-surface text-2xl text-hc-muted ring-1 ring-hc-border"
        initial={reduced ? false : { scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: reduced ? DURACION_REDUCED_S : DURACION_ENTRADA_S, ease: EASE_PREMIUM }}
        aria-hidden
      >
        ···
      </motion.div>
      <motion.h2
        className="font-display text-lg font-bold text-hc-text"
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduced ? 0 : 0.08, duration: DURACION_ENTRADA_S, ease: EASE_PREMIUM }}
      >
        {titulo}
      </motion.h2>
      {mensaje ? (
        <motion.p
          className="mx-auto mt-2 max-w-sm text-sm text-hc-muted"
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : 0.14, duration: DURACION_ENTRADA_S, ease: EASE_PREMIUM }}
        >
          {mensaje}
        </motion.p>
      ) : null}
      {accion ? <div className="mt-6 flex justify-center">{accion}</div> : null}
    </div>
  )
}
