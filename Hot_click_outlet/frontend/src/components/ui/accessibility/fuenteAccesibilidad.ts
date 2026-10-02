/**
 * Tamaño de la hoja (Figma `52:2389`). A es la raíz de 16 px; A+ es el escalón `fs-lg` (18 px).
 * A− es `fs-sm`: 87,5 % de la raíz (14 px), decisión D19 aceptada el 2-oct-2026.
 */

export const FUENTE_MENOR = 'sm'
export const FUENTE_MEDIA = 'normal'
export const FUENTE_MAYOR = 'lg'

export type ChipFuente = 'menor' | 'media' | 'mayor'

/**
 * Qué chip está marcado.
 * `normal` (default) es A. `sm` es A−. `lg` y `xl` marcan A+; `xl` no se rebaja solo.
 */
export function chipFuenteActivo(fontSize: string): ChipFuente {
  if (fontSize === FUENTE_MENOR) return 'menor'
  if (fontSize === FUENTE_MAYOR || fontSize === 'xl') return 'mayor'
  return 'media'
}

/** A+ guarda `lg`. Si ya está en `xl` (20 px), se deja ese valor. */
export function fuenteAlElegirMayor(fontSize: string): string {
  if (fontSize === 'xl') return 'xl'
  return FUENTE_MAYOR
}

/** A− guarda `sm` (87,5 %). */
export function fuenteAlElegirMenor(): string {
  return FUENTE_MENOR
}
