import type { SolicitudRecoleccion } from './recoleccionTipos'

export function listaRecolecciones(data: unknown): SolicitudRecoleccion[] {
  if (Array.isArray(data)) return data as SolicitudRecoleccion[]
  if (data && typeof data === 'object' && 'data' in data) {
    const inner = (data as { data: unknown }).data
    if (Array.isArray(inner)) return inner as SolicitudRecoleccion[]
  }
  return []
}

export function formatoTarifa(colones: number | null | undefined): string {
  if (colones == null) return 'Pendiente'
  return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(colones)
}
