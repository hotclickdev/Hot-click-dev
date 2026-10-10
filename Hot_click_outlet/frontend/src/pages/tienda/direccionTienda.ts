export type PartesDireccion = { provincia: string; canton: string; distrito: string; senas: string }

/**
 * Une provincia, cantón, distrito y señas en el texto que guarda el pedido.
 * Devuelve '' mientras falte provincia, cantón o señas, así la validación de domicilio sigue frenando.
 */
export function componerDireccion({ provincia, canton, distrito, senas }: PartesDireccion): string {
  const s = senas.trim()
  if (!provincia || !canton || !s) return ''
  const zona = [distrito, canton, provincia].filter(Boolean).join(', ')
  return `${zona}. ${s}`.slice(0, 500)
}
