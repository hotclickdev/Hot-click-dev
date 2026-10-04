/**
 * Destino de Tab dentro de un diálogo modal. `indice` es la posición del foco entre los `total`
 * controles enfocables (-1 si el foco está fuera o en el propio contenedor).
 * Devuelve el índice al que hay que mover el foco, o `null` si el navegador puede seguir solo.
 */
export function destinoTab(total: number, indice: number, haciaAtras: boolean): number | null {
  if (total === 0) return null
  const ultimo = total - 1
  if (indice < 0) return haciaAtras ? ultimo : 0
  if (haciaAtras) return indice === 0 ? ultimo : null
  return indice === ultimo ? 0 : null
}
