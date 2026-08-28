import type { ReactNode } from 'react'
import TrustGlyph from './TrustGlyph'

/**
 * Palabra visible + más SVG. El texto es el que lee el usuario.
 */
export default function TextoMas({
  children,
  className = 'inline-flex items-center gap-1.5',
  iconClassName = 'w-3.5 h-3.5',
}: {
  children?: ReactNode
  className?: string
  iconClassName?: string
}) {
  return (
    <span className={className}>
      <TrustGlyph tipo="mas" className={iconClassName} />
      {children}
    </span>
  )
}
