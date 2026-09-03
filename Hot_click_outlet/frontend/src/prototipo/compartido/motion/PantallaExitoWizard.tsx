import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { SPRING_POP, EASE_PREMIUM } from './formularioMotionTokens'
import './formularioMotion.css'

type Props = Readonly<{
  titulo: string
  mensaje?: string
  accion?: ReactNode
  confeti?: boolean
}>

/**
 * Pantalla de éxito del wizard: check spring + texto en stagger.
 * Float CSS va en wrapper interno para no pelear con scale de Framer.
 */
export default function PantallaExitoWizard({
  titulo,
  mensaje,
  accion,
  confeti = true,
}: Props) {
  const reduced = useReducedMotion() ?? false
  return (
    <div className="relative overflow-hidden px-2 py-8 text-center">
      {confeti && !reduced ? <ConfetiLigero /> : null}
      <motion.div
        className="mx-auto mb-6 flex size-20 items-center justify-center"
        initial={reduced ? false : { scale: 0 }}
        animate={{ scale: 1 }}
        transition={reduced ? { duration: 0.15 } : SPRING_POP}
        aria-hidden
      >
        <div
          className={`flex size-20 items-center justify-center rounded-full text-3xl font-bold text-[var(--hc-success)] ${reduced ? '' : 'hc-wizard-float'}`}
          style={{ background: 'var(--hc-success-bg)' }}
        >
          ✓
        </div>
      </motion.div>
      <motion.h1
        className="font-display text-xl font-bold text-hc-text"
        initial={reduced ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduced ? 0 : 0.12, duration: 0.35, ease: EASE_PREMIUM }}
      >
        {titulo}
      </motion.h1>
      {mensaje ? (
        <motion.p
          className="mt-2 text-sm text-hc-muted"
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : 0.22, duration: 0.35, ease: EASE_PREMIUM }}
        >
          {mensaje}
        </motion.p>
      ) : null}
      {accion ? (
        <motion.div
          className="mt-8"
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : 0.9, duration: 0.3, ease: EASE_PREMIUM }}
        >
          {accion}
        </motion.div>
      ) : null}
    </div>
  )
}

function ConfetiLigero() {
  const piezas = Array.from({ length: 18 }, (_, i) => i)
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {piezas.map((i) => (
        <motion.span
          key={i}
          className="absolute top-0 size-2 rounded-sm"
          style={{
            left: `${6 + ((i * 5.5) % 88)}%`,
            background: i % 3 === 0 ? 'var(--hc-primary)' : i % 3 === 1 ? 'var(--hc-accent)' : 'var(--hc-success)',
          }}
          initial={{ y: -12, opacity: 0, rotate: 0 }}
          animate={{ y: 200, opacity: [0, 1, 0], rotate: 220 }}
          transition={{ duration: 1.25, delay: i * 0.035, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

/** Navega con View Transitions API si el navegador la soporta. */
export function navegarConTransicion(navegar: () => void) {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => void
  }
  if (typeof doc.startViewTransition === 'function') {
    doc.startViewTransition(navegar)
    return
  }
  navegar()
}
