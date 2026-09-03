import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  DELAY_HIJOS_S,
  DESPLAZAMIENTO_ITEM_PX,
  DURACION_ENTRADA_S,
  DURACION_REDUCED_S,
  EASE_ENTRADA,
  SPRING_ENTRADA,
  STAGGER_HIJOS_S,
} from './formularioMotionTokens'

type ListaProps = Readonly<{
  children: ReactNode
  className?: string
}>

type ItemProps = Readonly<{
  children: ReactNode
  className?: string
}>

/**
 * Contenedor stagger para filas/cards de listados Capa C y stacks de wizard.
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
          transition: reduced
            ? undefined
            : { staggerChildren: STAGGER_HIJOS_S, delayChildren: DELAY_HIJOS_S },
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
        oculto: reduced ? { opacity: 0 } : { opacity: 0, y: DESPLAZAMIENTO_ITEM_PX },
        visible: {
          opacity: 1,
          y: 0,
          transition: reduced
            ? { duration: DURACION_REDUCED_S }
            : { ...SPRING_ENTRADA, duration: DURACION_ENTRADA_S, ease: EASE_ENTRADA },
        },
      }}
    >
      {children}
    </motion.div>
  )
}
