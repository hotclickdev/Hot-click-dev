import type { ReactNode } from 'react'
import TrustGlyph from './TrustGlyph'

/**
 * Camino o secuencia visible: partes unidas con chevron SVG.
 * El texto es el que lee el usuario.
 */
export default function TextoCamino({
  partes,
  className = 'inline-flex items-center flex-wrap gap-x-1',
  iconClassName = 'w-3 h-3 shrink-0',
}: {
  partes?: ReactNode[]
  className?: string
  iconClassName?: string
}) {
  if (!partes?.length) return null
  return (
    <span className={className}>
      {partes.map((parte, i) => (
        <span key={i} className="inline-flex items-center gap-x-1">
          {i > 0 ? <TrustGlyph tipo="adelante" className={iconClassName} /> : null}
          {parte}
        </span>
      ))}
    </span>
  )
}
