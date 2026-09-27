import type { CSSProperties } from 'react'

type IconoFigmaProps = {
  src: string
  size: number
  className?: string
}

/**
 * Ícono SVG exportado del Figma, pintado con `currentColor` vía máscara
 * para que el mismo archivo sirva en estado activo e inactivo.
 */
export default function IconoFigma({ src, size, className = '' }: IconoFigmaProps) {
  const style: CSSProperties = {
    width: size,
    height: size,
    maskImage: `url("${src}")`,
    WebkitMaskImage: `url("${src}")`,
    maskSize: '100% 100%',
    WebkitMaskSize: '100% 100%',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
  }
  return <span aria-hidden="true" className={`inline-block shrink-0 bg-current ${className}`} style={style} />
}
