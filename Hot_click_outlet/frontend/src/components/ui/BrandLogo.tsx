/**
 * Logo oficial HotClick (Brand Book v1.1, §2.1–§2.4).
 * Símbolo: carrito Rojo Hot + cursor Azul Click. Wordmark: «Hot» rojo +
 * «Click» azul en Sora 800, una sola palabra. En modo oscuro los colores
 * del wordmark se elevan vía --hc-wordmark-* (definidos en index.css).
 */

export function HotClickMark({
  className,
  size = 28,
  gap = 'var(--hc-surface, #FFFFFF)',
}: {
  className?: string
  size?: number
  gap?: string
}) {
  return (
    <svg
      viewBox="0 0 224 188"
      width={size}
      height={Math.round(size * (188 / 224))}
      className={className}
      role="img"
      aria-label="HotClick"
    >
      <g fill="var(--hc-wordmark-hot, #E73B33)">
        <path d="M30 26 H58 L74 52" fill="none" stroke="var(--hc-wordmark-hot, #E73B33)" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M58 48 L188 48 L172.5 120 Q170 132 157.5 132 L88.5 132 Q76 132 73.5 120 Z" stroke="var(--hc-wordmark-hot, #E73B33)" strokeWidth="8" strokeLinejoin="round" />
        <rect x="66" y="138" width="114" height="13" rx="6.5" />
        <circle cx="94" cy="166" r="15" />
        <circle cx="154" cy="166" r="15" />
      </g>
      <g fill="none" stroke={gap} strokeWidth="12" strokeLinecap="round">
        <path d="M111 72 L102 102" />
        <path d="M141 72 L132 102" />
      </g>
      <g>
        <g fill="none" stroke="var(--hc-wordmark-click, #1747A8)" strokeWidth="9" strokeLinecap="round">
          <path d="M157 4 L159 14" />
          <path d="M136 10 L143 17" />
          <path d="M126 30 L136 31" />
        </g>
        <path
          d="M0 0 L0 31 L8.6 24 L13.8 36.2 L20.2 33.5 L15 21.6 L24.4 21.6 Z"
          transform="translate(162 38) rotate(-45) scale(1.85)"
          fill="var(--hc-wordmark-click, #1747A8)"
          paintOrder="stroke"
          stroke={gap}
          strokeWidth="9"
          strokeLinejoin="round"
        />
      </g>
    </svg>
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
