const formateadorCrc = new Intl.NumberFormat('es-CR')

/**
 * Formatea un monto entero en colones costarricenses.
 * @param {number} colones
 */
export function formatoColon(colones: number): string {
  return `₡${formateadorCrc.format(Math.round(colones ?? 0))}`
}
