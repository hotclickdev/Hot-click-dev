/**
 * Íconos de "Recuperar contraseña" (Figma 44:1551 / 44:1580 / 44:1614).
 * Misma geometría y tamaño que los assets del Figma, con stroke en currentColor
 * para que el color salga de los tokens (--hc-*) y respete el tema.
 */
type IconoProps = { className?: string }

const TRAZO = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function IconoFlechaAtras({ className }: IconoProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" className={className} {...TRAZO}>
      <path d="M17.4167 11H4.58333M11 4.58333L4.58333 11L11 17.4167" />
    </svg>
  )
}

export function IconoCandadoGrande({ className }: IconoProps) {
  return (
    <svg width="25.76" height="25.76" viewBox="0 0 25.76 25.76" className={className} {...TRAZO}>
      <path d="M19.32 11.8067H6.44C5.25443 11.8067 4.29333 12.7678 4.29333 13.9533V20.3933C4.29333 21.5789 5.25443 22.54 6.44 22.54H19.32C20.5056 22.54 21.4667 21.5789 21.4667 20.3933V13.9533C21.4667 12.7678 20.5056 11.8067 19.32 11.8067Z" />
      <path d="M8.58667 11.8067V7.51333C8.58667 6.37467 9.039 5.28264 9.84416 4.47749C10.6493 3.67233 11.7413 3.22 12.88 3.22C14.0187 3.22 15.1107 3.67233 15.9158 4.47749C16.721 5.28264 17.1733 6.37467 17.1733 7.51333V11.8067" />
    </svg>
  )
}

export function IconoSobreGrande({ className }: IconoProps) {
  return (
    <svg width="25.76" height="25.76" viewBox="0 0 25.76 25.76" className={className} {...TRAZO}>
      <path d="M20.3933 5.36667H5.36667C4.1811 5.36667 3.22 6.32776 3.22 7.51333V18.2467C3.22 19.4322 4.1811 20.3933 5.36667 20.3933H20.3933C21.5789 20.3933 22.54 19.4322 22.54 18.2467V7.51333C22.54 6.32776 21.5789 5.36667 20.3933 5.36667Z" />
      <path d="M3.22 7.51333L12.88 13.9533L22.54 7.51333" />
    </svg>
  )
}

export function IconoSobre({ className }: IconoProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" className={className} {...TRAZO}>
      <path d="M14.25 3.75H3.75C2.92157 3.75 2.25 4.42157 2.25 5.25V12.75C2.25 13.5784 2.92157 14.25 3.75 14.25H14.25C15.0784 14.25 15.75 13.5784 15.75 12.75V5.25C15.75 4.42157 15.0784 3.75 14.25 3.75Z" />
      <path d="M2.25 5.25L9 9.75L15.75 5.25" />
    </svg>
  )
}

export function IconoCandado({ className }: IconoProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" className={className} {...TRAZO}>
      <path d="M13.5 8.25H4.5C3.67157 8.25 3 8.92157 3 9.75V14.25C3 15.0784 3.67157 15.75 4.5 15.75H13.5C14.3284 15.75 15 15.0784 15 14.25V9.75C15 8.92157 14.3284 8.25 13.5 8.25Z" />
      <path d="M6 8.25V5.25C6 4.45435 6.31607 3.69129 6.87868 3.12868C7.44129 2.56607 8.20435 2.25 9 2.25C9.79565 2.25 10.5587 2.56607 11.1213 3.12868C11.6839 3.69129 12 4.45435 12 5.25V8.25" />
    </svg>
  )
}

export function IconoOjo({ className }: IconoProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" className={className} {...TRAZO}>
      <path d="M1.5 9C1.5 9 4.125 3.75 9 3.75C13.875 3.75 16.5 9 16.5 9C16.5 9 13.875 14.25 9 14.25C4.125 14.25 1.5 9 1.5 9Z" />
      <path d="M9 11.25C10.2426 11.25 11.25 10.2426 11.25 9C11.25 7.75736 10.2426 6.75 9 6.75C7.75736 6.75 6.75 7.75736 6.75 9C6.75 10.2426 7.75736 11.25 9 11.25Z" />
    </svg>
  )
}

/** Estado "ocultar" del mismo ojo (no está en el Figma: el ojo tachado es su par natural). */
export function IconoOjoTachado({ className }: IconoProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" className={className} {...TRAZO}>
      <path d="M1.5 9C1.5 9 4.125 3.75 9 3.75C13.875 3.75 16.5 9 16.5 9C16.5 9 13.875 14.25 9 14.25C4.125 14.25 1.5 9 1.5 9Z" />
      <path d="M9 11.25C10.2426 11.25 11.25 10.2426 11.25 9C11.25 7.75736 10.2426 6.75 9 6.75C7.75736 6.75 6.75 7.75736 6.75 9C6.75 10.2426 7.75736 11.25 9 11.25Z" />
      <path d="M2.25 2.25L15.75 15.75" />
    </svg>
  )
}

export function IconoCheck({ className }: IconoProps) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" className={className} {...TRAZO}>
      <path d="M2.91667 7L5.83333 9.91667L11.6667 4.08333" />
    </svg>
  )
}

export function IconoEquis({ className }: IconoProps) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" className={className} {...TRAZO}>
      <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" />
    </svg>
  )
}
