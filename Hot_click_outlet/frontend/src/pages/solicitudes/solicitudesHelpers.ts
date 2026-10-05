import type { SolicitudBusqueda } from '../servicios/serviciosHelpers'

/**
 * Cómo ve el comprador cada estado del backend (`SolicitudServicio.estado`):
 * Cotizada (ENCONTRADO), En búsqueda (PENDIENTE y EN_BUSQUEDA) y Cerrada (NO_ENCONTRADO y CANCELADO).
 */
export type EstadoVisual = 'cotizada' | 'enBusqueda' | 'cerrada'

export function estadoVisual(estado?: string): EstadoVisual {
  if (estado === 'ENCONTRADO') return 'cotizada'
  if (estado === 'NO_ENCONTRADO' || estado === 'CANCELADO') return 'cerrada'
  return 'enBusqueda'
}

export const CLASE_CHIP_SOLICITUD: Record<EstadoVisual, string> = {
  cotizada: 'bg-hc-green-50 text-hc-success-text',
  enBusqueda: 'bg-hc-warning-bg text-hc-warning',
  cerrada: 'bg-hc-n-100 text-hc-n-600',
}

/** Clave i18n de la tercera línea de la tarjeta cuando no hay respuesta escrita de HotClick. */
export function claveLinea(estado?: string): string {
  switch (estado) {
    case 'ENCONTRADO': return 'solicitudes.lineas.cotizada'
    case 'NO_ENCONTRADO': return 'solicitudes.lineas.noEncontrado'
    case 'CANCELADO': return 'solicitudes.lineas.cancelada'
    case 'EN_BUSQUEDA': return 'solicitudes.lineas.enBusqueda'
    default: return 'solicitudes.lineas.pendiente'
  }
}

/** `fotosUrls` llega como texto JSON con un arreglo de URLs https; cualquier otra forma se ignora. */
export function fotosDeSolicitud(fotosUrls: string | null | undefined): string[] {
  if (!fotosUrls) return []
  try {
    const parsed: unknown = JSON.parse(fotosUrls)
    return Array.isArray(parsed) ? urlsFotoHttps(parsed) : []
  } catch {
    return urlsFotoHttps([fotosUrls])
  }
}

/** El panel pinta estas URLs en un `<img>`. Solo https: nada de javascript: ni data:. */
export function urlsFotoHttps(urls: unknown[]): string[] {
  return urls.filter((u): u is string => typeof u === 'string' && /^https:\/\//i.test(u.trim()))
}

export function solicitudPorId(solicitudes: SolicitudBusqueda[], id: string | null): SolicitudBusqueda | null {
  if (!id) return null
  return solicitudes.find((s) => String(s.id) === id) ?? null
}

/** "23 set. · 15:47": fecha y hora corta del historial (Figma `29:1638`). */
export function fechaHora(iso: string | undefined, fecha: string): string {
  const m = iso ? /T(\d{2}):(\d{2})/.exec(iso) : null
  return m ? `${fecha} · ${m[1]}:${m[2]}` : fecha
}
