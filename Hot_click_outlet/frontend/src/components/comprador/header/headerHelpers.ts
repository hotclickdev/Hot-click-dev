/** Iniciales para el avatar del header (Figma `30:1491`: "MR"). Máximo dos letras. */
export function inicialesDe(nombre: string | null | undefined): string {
  const palabras = (nombre ?? '').trim().split(/\s+/).filter(Boolean)
  if (palabras.length === 0) return ''
  const primera = palabras[0]
  if (palabras.length === 1) return primera.slice(0, 2).toUpperCase()
  return (primera[0] + palabras[palabras.length - 1][0]).toUpperCase()
}

/**
 * Indica si el historial del navegador permite volver sin salir del sitio.
 * `idx` lo guarda React Router en `history.state`; en la primera entrada vale 0.
 */
export function puedeVolverAtras(estadoHistorial: unknown): boolean {
  const idx = (estadoHistorial as { idx?: unknown } | null)?.idx
  return typeof idx === 'number' && idx > 0
}
