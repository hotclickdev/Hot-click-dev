/** Iniciales de hasta dos palabras ("Bruma Café" -> "BC"). */
export function inicialesNegocio(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  if (palabras.length === 0) return '?'
  return palabras.map((p) => p.charAt(0).toUpperCase()).join('')
}
