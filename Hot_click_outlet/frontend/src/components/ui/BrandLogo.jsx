import { useId } from 'react'

/** Rayo del isotipo v2 (mini-manual: geometría del mark sobre retícula). */
const RAYO_PATH = 'M27.5 8 L14 25.5 H23.5 L19.5 40 L36 21 H26.2 Z'

/**
 * Isotipo oficial HOTCLICK v2: rayo blanco sobre cuadrado con gradiente
 * violeta→cian. `variant="mono"` usa currentColor en el fondo.
 */
export function HotClickMark({ className, size = 28, variant = 'color' }) {
  const uid = useId().replace(/:/g, '')
  const gradientId = `hc-mark-${uid}`
  const isMono = variant === 'mono'

  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="HOTCLICK"
    >
      {!isMono && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--hc-purple, #863bff)" />
            <stop offset="100%" stopColor="var(--hc-cyan, #47bfff)" />
          </linearGradient>
        </defs>
      )}
      <rect
        width="48"
        height="48"
        rx="10"
        fill={isMono ? 'currentColor' : `url(#${gradientId})`}
      />
      <path d={RAYO_PATH} fill={isMono ? 'var(--hc-bg, #fff)' : '#fff'} />
    </svg>
  )
}

/** Wordmark oficial: HOTCLICK en Barlow Black, una sola palabra. */
export function HotClickWordmark({ className = '', size }) {
  return (
    <span
      className={`hc-wordmark leading-none ${className}`}
      style={size ? { fontSize: size } : undefined}
    >
      HOTCLICK
    </span>
  )
}

export default function BrandLogo({ size = 28, wordmarkSize = 18, wordmarkClassName = '' }) {
  return (
    <span className="inline-flex items-center gap-2">
      <HotClickMark size={size} />
      <HotClickWordmark className={wordmarkClassName} size={wordmarkSize} />
    </span>
  )
}
