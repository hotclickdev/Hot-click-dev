const formateadorCrc = new Intl.NumberFormat('es-CR', { maximumFractionDigits: 0 })
const ESPACIOS_DE_MILES = /[\s\u00a0\u202f]/g

/** Miles con punto como en el Figma («95.900»); `es-CR` los separa con espacio. */
export function formatoMiles(monto: number): string {
  return formateadorCrc.format(Math.round(monto ?? 0)).replace(ESPACIOS_DE_MILES, '.')
}

/**
 * Formatea un monto entero en colones costarricenses.
 * @param {number} colones
 */
export function formatoColon(colones: number): string {
  return `₡${formatoMiles(colones)}`
}
