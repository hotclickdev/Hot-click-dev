import { formatPrice } from '@/utils/format'

/**
 * Formatea un monto entero en colones costarricenses.
 * @param {number} colones
 */
export function formatoColon(colones: number): string {
  return formatPrice(Math.round(colones ?? 0))
}
