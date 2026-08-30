type Tono = 'exito' | 'alerta' | 'marca' | 'info'

const TONOS: Record<Tono, string> = {
  exito: 'bg-[var(--hc-success-bg)] text-hc-success',
  alerta: 'bg-[var(--hc-warning-bg)] text-hc-warning',
  marca: 'bg-[var(--hc-red-50)] text-hc-primary',
  info: 'bg-[var(--hc-info-bg)] text-hc-accent',
}

import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  tono?: Tono
}

/**
 * Badge de categoría o estado (Publicado / Pausado).
 */
export default function BadgeEstado({ children, tono = 'marca' }: Props) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-medium ${TONOS[tono]}`}>
      {children}
    </span>
  )
}
