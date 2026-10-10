export const PLAZOS = [30, 60] as const

export function mensajeTiendaRapida(persona: string, negocio: string, dias: number, url: string): string {
  const nombre = persona.trim().split(/\s+/)[0]
  const saludo = nombre ? `Hola ${nombre}, soy de HotClick.` : 'Hola, soy de HotClick.'
  return `${saludo} Te dejé lista la tienda ${negocio} por ${dias} días. Yo cargo los productos; vos completá tus datos aquí: ${url}`
}

export function enlaceTiendaRapida(token: string): string {
  if (typeof window === 'undefined' || !token) return ''
  return `${window.location.origin}/tienda-rapida/${token}`
}

export function etiquetaRapida(estado: string): string {
  if (estado === 'LISTA') return 'Datos listos'
  if (estado === 'VENCIDA') return 'Venció'
  return 'Esperando datos'
}

export const RUTA_ONBOARDING_RAPIDO = '/emprendedor/negocio-rapido'

/** 409 = enlace ya usado; 410 = vencido o anulado; el resto, no vigente. */
export function motivoEnlace(err: unknown): 'usado' | 'vencido' | 'noVigente' {
  const status = err && typeof err === 'object' && 'response' in err
    ? (err as { response?: { status?: unknown } }).response?.status
    : undefined
  if (status === 409) return 'usado'
  if (status === 410) return 'vencido'
  return 'noVigente'
}

export type PasoOnboarding = { paso: string; estado: string; omitible: boolean }

const DESTINO_PASO: Record<string, string> = {
  BODEGA: '/emprendedor/opciones/bodegas/nueva',
  PRODUCTO: '/emprendedor/productos/nuevo',
  NEGOCIO: '/emprendedor/opciones/negocio',
  COBRO: '/emprendedor/opciones/cobro',
}

export function destinoPaso(paso: string): string {
  return DESTINO_PASO[paso] ?? '/emprendedor'
}

/** Normaliza la respuesta del backend; un paso desconocido se descarta. */
export function pasosDe(data: unknown): PasoOnboarding[] {
  const lista = data && typeof data === 'object' && Array.isArray((data as { pasos?: unknown }).pasos)
    ? (data as { pasos: unknown[] }).pasos
    : []
  return lista
    .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
    .map((p) => ({ paso: String(p.paso ?? ''), estado: String(p.estado ?? 'PENDIENTE'), omitible: p.omitible === true }))
    .filter((p) => p.paso in DESTINO_PASO)
}
