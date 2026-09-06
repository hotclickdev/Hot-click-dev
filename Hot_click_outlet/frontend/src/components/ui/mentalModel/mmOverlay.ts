import type { CSSProperties } from 'react'

export type MmRect = {
  top: number
  left: number
  width: number
  height: number
}

const PAD = 8
const RADIO = 14

/**
 * Rectángulo del ancla `data-mm`, con padding para el hueco del overlay.
 */
export function rectDeAncla(ancla: string): MmRect | null {
  if (!ancla) return null
  const el = document.querySelector(`[data-mm="${CSS.escape(ancla)}"]`)
  if (!(el instanceof HTMLElement)) return null
  const r = el.getBoundingClientRect()
  if (r.width < 2 && r.height < 2) return null
  return {
    top: Math.max(0, r.top - PAD),
    left: Math.max(0, r.left - PAD),
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
  }
}

/**
 * Box-shadow que oscurece toda la pantalla excepto el hueco del target.
 * Usa --hc-overlay (claro/oscuro) para contraste del spotlight.
 */
export function sombraSpotlight(): string {
  return '0 0 0 9999px var(--hc-overlay)'
}

export function estiloHueco(rect: MmRect | null): CSSProperties {
  if (!rect) {
    return {
      position: 'fixed',
      inset: 0,
      pointerEvents: 'none',
      boxShadow: sombraSpotlight(),
    }
  }
  return {
    position: 'fixed',
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    borderRadius: RADIO,
    boxShadow: sombraSpotlight(),
    pointerEvents: 'none',
    outline: '2px solid var(--hc-primary)',
    outlineOffset: 2,
  }
}

/**
 * Posición del tooltip: debajo del target si hay espacio, si no arriba.
 */
export function estiloTooltip(rect: MmRect | null): CSSProperties {
  const maxW = 320
  if (!rect) {
    return {
      position: 'fixed',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      width: `min(${maxW}px, calc(100vw - 2rem))`,
      zIndex: 101,
    }
  }
  const espacioAbajo = window.innerHeight - (rect.top + rect.height)
  const ponerAbajo = espacioAbajo > 160
  const left = Math.min(
    Math.max(16, rect.left + rect.width / 2 - maxW / 2),
    window.innerWidth - maxW - 16,
  )
  return {
    position: 'fixed',
    left,
    top: ponerAbajo ? rect.top + rect.height + 12 : Math.max(16, rect.top - 12),
    transform: ponerAbajo ? undefined : 'translateY(-100%)',
    width: `min(${maxW}px, calc(100vw - 2rem))`,
    zIndex: 101,
  }
}
