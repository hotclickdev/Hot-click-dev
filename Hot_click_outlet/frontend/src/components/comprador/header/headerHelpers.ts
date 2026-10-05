/** Iniciales para el avatar del header (Figma `30:1491`: "MR"). Máximo dos letras. */
export function inicialesDe(nombre: string | null | undefined): string {
  const palabras = (nombre ?? '').trim().split(/\s+/).filter(Boolean)
  if (palabras.length === 0) return ''
  const primera = palabras[0]
  if (palabras.length === 1) return primera.slice(0, 2).toUpperCase()
  return (primera[0] + palabras[palabras.length - 1][0]).toUpperCase()
}

/** `idx` lo guarda React Router en `history.state`; en la primera entrada vale 0. */
export function indiceHistorial(estadoHistorial: unknown): number | null {
  if (!estadoHistorial || typeof estadoHistorial !== 'object' || !('idx' in estadoHistorial)) return null
  const idx = (estadoHistorial as { idx?: unknown }).idx
  return typeof idx === 'number' ? idx : null
}

/** Verdadero si hay una entrada previa en esta visita, sin salir del sitio. */
export function puedeVolverAtras(estadoHistorial: unknown): boolean {
  const idx = indiceHistorial(estadoHistorial)
  return idx != null && idx > 0
}

/** Hay una entrada adelante solo si el índice actual quedó detrás del máximo de esta visita. */
export function puedeAvanzar(indice: number | null, indiceMaximo: number): boolean {
  return indice != null && indice < indiceMaximo
}
