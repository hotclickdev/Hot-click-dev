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

/** Query que marca un wizard abierto desde el onboarding; solo vale la clave de la lista. */
export const PARAM_VOLVER = 'volver'
const VOLVER_PERMITIDO: Record<string, string> = { 'negocio-rapido': RUTA_ONBOARDING_RAPIDO }
export const SUFIJO_VOLVER_ONBOARDING = `?${PARAM_VOLVER}=negocio-rapido`

/** Ruta de vuelta tras guardar, o null si no vino de una entrada permitida (sin open redirect). */
export function rutaVolver(search: string): string | null {
  const clave = new URLSearchParams(search).get(PARAM_VOLVER)
  return clave && Object.hasOwn(VOLVER_PERMITIDO, clave) ? VOLVER_PERMITIDO[clave] : null
}

const DESTINO_PASO: Record<string, string> = {
  BODEGA: `/emprendedor/opciones/bodegas/nueva${SUFIJO_VOLVER_ONBOARDING}`,
  PRODUCTO: `/emprendedor/productos/nuevo${SUFIJO_VOLVER_ONBOARDING}`,
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

/** true solo si el backend devolvió un onboarding con pasos y sin completar. */
export function onboardingPendiente(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false
  const d = data as { completo?: unknown }
  return d.completo === false && pasosDe(data).length > 0
}
