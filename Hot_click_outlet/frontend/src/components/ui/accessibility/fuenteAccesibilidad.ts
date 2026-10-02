/** Tamaño de la hoja (Figma `52:2389`). A es la raíz de 16 px; A+ es el escalón `fs-lg`. A− no tiene tamaño menor. */

export const FUENTE_MEDIA = 'normal'
export const FUENTE_MAYOR = 'lg'

export type ChipFuente = 'menor' | 'media' | 'mayor'

/**
 * Qué chip está marcado.
 * `normal` (default) es A. `lg` y `xl` marcan A+; `xl` no se rebaja solo.
 * A− no tiene valor: nunca queda marcado.
 */
export function chipFuenteActivo(fontSize: string): ChipFuente {
  if (fontSize === FUENTE_MAYOR || fontSize === 'xl') return 'mayor'
  return 'media'
}

/** A+ guarda `lg`. Si ya está en `xl` (20 px), se deja ese valor. */
export function fuenteAlElegirMayor(fontSize: string): string {
  if (fontSize === 'xl') return 'xl'
  return FUENTE_MAYOR
}

/** A− no tiene un tamaño menor en Figma: pulsarlo no cambia la raíz. */
export function fuenteAlElegirMenor(fontSize: string): string {
  return fontSize
}
