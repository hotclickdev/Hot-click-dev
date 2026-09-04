import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

type Props = {
  children: ReactNode
  className?: string
}

/** Animación al entrar en viewport. Sin movimiento si el usuario lo pide. */
export default function EmprendeReveal({ children, className }: Props) {
  const reducir = useReducedMotion()
  if (reducir) {
    return <div className={className}>{children}</div>
  }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.div>
  )
}
