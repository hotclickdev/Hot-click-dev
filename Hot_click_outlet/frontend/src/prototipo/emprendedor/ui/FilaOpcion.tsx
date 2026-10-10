import { Link } from 'react-router-dom'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import { motion, useReducedMotion } from 'framer-motion'
import { EASE_PREMIUM } from '@/prototipo/compartido/motion/formularioMotionTokens'

const MotionLink = motion.create(Link)

function Candado() {
  return (
    <svg viewBox="0 0 20 20" className="size-4 shrink-0" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="4" y="9" width="12" height="8" rx="1.5" />
      <path d="M7 9V6.5a3 3 0 0 1 6 0V9" />
    </svg>
  )
}

type Props = {
  to?: string
  onClick?: () => void
  etiqueta: string
  peligro?: boolean
  dataMm?: string
  bloqueo?: { to: string; texto: string }
}

/**
 * Fila de menú Opciones (Figma chevron ›).
 */
export default function FilaOpcion({ to, onClick, etiqueta, peligro = false, dataMm, bloqueo }: Props) {
  const reduced = useReducedMotion() ?? false
  const color = peligro ? 'text-hc-primary' : 'text-hc-text'
  const clases = `flex min-h-11 w-full items-center justify-between border-b border-hc-border py-4 text-left text-sm font-medium ${color}`
  const attrs = dataMm ? { 'data-mm': dataMm } : {}
  const whileHover = reduced ? undefined : { x: 3 }
  const whileTap = reduced ? undefined : { scale: 0.99 }
  const transition = { duration: 0.18, ease: EASE_PREMIUM }
  const contenido = (
    <>
      <span className="flex items-center gap-2">
        {bloqueo ? <Candado /> : null}
        {etiqueta}
      </span>
      {bloqueo
        ? <span className="text-sm font-semibold text-hc-red-500">{bloqueo.texto}</span>
        : <ChevronRightIcon className="size-4 shrink-0 opacity-60" />}
    </>
  )
  if (bloqueo) {
    return (
      <MotionLink to={bloqueo.to} className={clases} whileHover={whileHover} whileTap={whileTap} transition={transition} {...attrs}>
        {contenido}
      </MotionLink>
    )
  }
  if (to) {
    return (
      <MotionLink
        to={to}
        className={clases}
        whileHover={whileHover}
        whileTap={whileTap}
        transition={transition}
        {...attrs}
      >
        {contenido}
      </MotionLink>
    )
  }
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={clases}
      whileHover={whileHover}
      whileTap={whileTap}
      transition={transition}
      {...attrs}
    >
      {contenido}
    </motion.button>
  )
}
