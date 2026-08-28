import type { ReactNode } from 'react'
import TrustGlyph from './TrustGlyph'

/**
 * Palabra visible + chevron SVG. El texto es el que lee el usuario.
 */
export default function TextoFlecha({
  dir = 'adelante',
  children,
  className = 'inline-flex items-center gap-1',
  iconClassName = 'w-3.5 h-3.5',
}: {
  dir?: 'atras' | 'adelante'
  children?: ReactNode
  className?: string
  iconClassName?: string
}) {
  return (
    <span className={className}>
      {dir === 'atras' ? <TrustGlyph tipo="atras" className={iconClassName} /> : null}
      {children}
      {dir === 'adelante' ? <TrustGlyph tipo="adelante" className={iconClassName} /> : null}
    </span>
  )
}
