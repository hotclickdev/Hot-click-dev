import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { DURACION_ENTRADA_S, DURACION_REDUCED_S, EASE_ENTRADA } from './formularioMotionTokens'

const STAGGER_S = 0.045
const DELAY_HIJOS_S = 0.06

type ListaProps = Readonly<{
  children: ReactNode
  className?: string
}>

type ItemProps = Readonly<{
  children: ReactNode
  className?: string
}>

/**
 * Contenedor stagger para filas/cards de listados Capa C.
 */
export function ListaStagger({ children, className }: ListaProps) {
  const reduced = useReducedMotion() ?? false
  return (
    <motion.div
      className={className}
      initial="oculto"
      animate="visible"
      variants={{
        oculto: {},
        visible: {
          transition: reduced ? undefined : { staggerChildren: STAGGER_S, delayChildren: DELAY_HIJOS_S },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

export function ItemListaStagger({ children, className }: ItemProps) {
  const reduced = useReducedMotion() ?? false
  return (
    <motion.div
      className={className}
      variants={{
        oculto: reduced ? { opacity: 0 } : { opacity: 0, y: 10 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: reduced ? DURACION_REDUCED_S : DURACION_ENTRADA_S,
            ease: EASE_ENTRADA,
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}
