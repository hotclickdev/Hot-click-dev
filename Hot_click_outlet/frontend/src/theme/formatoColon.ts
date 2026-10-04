import { formatMiles, formatPrice } from '@/utils/format'

/** Miles con punto como en el Figma («95.900»); redondea antes de agrupar. */
export function formatoMiles(monto: number): string {
  return formatMiles(Math.round(monto ?? 0))
}

/**
 * Formatea un monto entero en colones costarricenses.
 * @param {number} colones
 */
export function formatoColon(colones: number): string {
  return formatPrice(Math.round(colones ?? 0))
}
