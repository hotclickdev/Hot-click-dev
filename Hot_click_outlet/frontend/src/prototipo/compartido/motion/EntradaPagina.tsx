import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { DURACION_ENTRADA_S, DURACION_REDUCED_S, EASE_ENTRADA } from './formularioMotionTokens'

type Props = Readonly<{
  children: ReactNode
  className?: string
}>

/**
 * Entrada suave de página Capa C (listados / menús). Solo opacity + y.
 */
export default function EntradaPagina({ children, className }: Props) {
  const reduced = useReducedMotion() ?? false
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduced ? DURACION_REDUCED_S : DURACION_ENTRADA_S,
        ease: EASE_ENTRADA,
      }}
    >
      {children}
    </motion.div>
  )
}
