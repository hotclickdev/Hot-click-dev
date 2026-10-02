/**
 * Formato único de teléfonos de Costa Rica para mostrar: `8888-1234` (decisión R2, 2-oct-2026).
 * El valor guardado no cambia (`+50688881234` en el checkout); esto es solo presentación.
 */

export const PREFIJO_CR = '+506'
const DIGITOS_CR = 8

/** Dígitos locales: quita el prefijo `+506` / `506` y todo lo que no sea dígito. Máximo 8. */
export function digitosTelefonoCR(valor: string | null | undefined): string {
  const solo = (valor ?? '').replace(/\D/g, '')
  const local = solo.length > DIGITOS_CR && solo.startsWith('506') ? solo.slice(3) : solo
  return local.slice(0, DIGITOS_CR)
}

/**
 * `8888-1234`. Con menos de 8 dígitos (mientras se escribe) agrega el guion después del cuarto.
 * Si el valor no es un número de Costa Rica (más de 8 dígitos sin prefijo 506), se devuelve tal cual.
 */
export function formatTelefonoCR(valor: string | null | undefined): string {
  const texto = (valor ?? '').trim()
  const solo = texto.replace(/\D/g, '')
  const esCR = solo.length <= DIGITOS_CR || (solo.startsWith('506') && solo.length === DIGITOS_CR + 3)
  if (!esCR) return texto
  const d = digitosTelefonoCR(texto)
  return d.length > 4 ? `${d.slice(0, 4)}-${d.slice(4)}` : d
}
