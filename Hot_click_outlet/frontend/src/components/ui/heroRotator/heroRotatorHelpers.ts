import type { TFunction } from 'i18next'
import type { Convenio } from './heroRotatorData'

/** Escala tamaño con viewport: 100% en 1440px → ~35% en 375px */
export function vs(size: number): string {
  const min = Math.round(size * 0.32)
  return `clamp(${min}px, ${(size / 1440 * 100).toFixed(2)}vw, ${size}px)`
}

export function esConvenio(item: unknown): item is Convenio {
  return typeof item === 'object' && item !== null
}

export function ocultarImagenSiError(e: { target: EventTarget | null }): void {
  const el = e.target
  if (el instanceof HTMLImageElement) el.style.display = 'none'
}

/** Arrays de locale vía returnObjects (hero.questions, chips, etc.). */
export function tStringArray(t: TFunction, key: string): string[] {
  const value = t(key, { returnObjects: true })
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}
