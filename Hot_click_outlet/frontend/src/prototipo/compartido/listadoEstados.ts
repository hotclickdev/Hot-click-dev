/**
 * Fase de un listado seller (loading → error → empty → listo).
 * Evita empty falso durante carga y unifica el orden de prioridad.
 */
export type FaseListado = 'cargando' | 'error' | 'vacio' | 'listo'

export function faseListado(opts: {
  cargando: boolean
  error: string | null | undefined
  cantidad: number
}): FaseListado {
  if (opts.cargando) return 'cargando'
  if (opts.error) return 'error'
  if (opts.cantidad === 0) return 'vacio'
  return 'listo'
}
