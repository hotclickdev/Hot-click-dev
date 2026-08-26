import TrustGlyph from './TrustGlyph'

/**
 * Palabra visible + chevron SVG. El texto es el que lee el usuario.
 * @param {{ dir?: 'atras'|'adelante', children: import('react').ReactNode, className?: string, iconClassName?: string }} props
 */
export default function TextoFlecha({
  dir = 'adelante',
  children,
  className = 'inline-flex items-center gap-1',
  iconClassName = 'w-3.5 h-3.5',
}) {
  return (
    <span className={className}>
      {dir === 'atras' ? <TrustGlyph tipo="atras" className={iconClassName} /> : null}
      {children}
      {dir === 'adelante' ? <TrustGlyph tipo="adelante" className={iconClassName} /> : null}
    </span>
  )
}
