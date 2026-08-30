/**
 * Logo HotClick (Figma · Manual de Marca): isotipo HC + wordmark «Hot» rojo + «Click» azul.
 * El PNG es el asset exportado del isotipo (nodo 226:130). `gap` se conserva por callers.
 */

const ISOTIPO_ANCHO = 300
const ISOTIPO_ALTO = 240
const ISOTIPO_SRC = '/brand/hotclick-isotipo.png'

export function HotClickMark({
  className,
  size = 28,
}: {
  className?: string
  size?: number
  gap?: string
}) {
  const height = size
  const width = Math.round(size * (ISOTIPO_ANCHO / ISOTIPO_ALTO))
  return (
    <img
      src={ISOTIPO_SRC}
      alt="HotClick"
      width={width}
      height={height}
      className={className}
      decoding="async"
    />
  )
}

export default function BrandLogo({
  size = 28,
  wordmarkSize = 18,
  wordmarkClassName = '',
}: {
  size?: number
  wordmarkSize?: number
  wordmarkClassName?: string
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <HotClickMark size={size} />
      <span
        className={`hc-wordmark leading-none ${wordmarkClassName}`}
        style={{ fontSize: wordmarkSize }}
      >
        <span className="hot">Hot</span><span className="click">Click</span>
      </span>
    </span>
  )
}
