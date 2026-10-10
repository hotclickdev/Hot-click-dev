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
    .map((p) => ({
      paso: typeof p.paso === 'string' ? p.paso : '',
      estado: typeof p.estado === 'string' ? p.estado : 'PENDIENTE',
      omitible: p.omitible === true,
    }))
    .filter((p) => p.paso in DESTINO_PASO)
}

/** true solo si el backend devolvió un onboarding con pasos y sin completar. */
export function onboardingPendiente(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false
  const d = data as { completo?: unknown }
  return d.completo === false && pasosDe(data).length > 0
}

/** Mismo texto que el backend (TiendaRapidaReglas.cedula) y que ya mostraba esta pantalla. */
export const AVISO_CEDULA_FORMATO = 'La cédula va con 9 a 12 dígitos.'

export type ErroresPaso1 = { persona?: string; cedula?: string }

/**
 * Paso 1 del enlace: nombre (2–80) y cédula física, jurídica o DIMEX (9–12 dígitos, como CedulaCr del backend).
 * Devuelve claves i18n existentes para «falta» y el aviso de formato para la cédula mal cargada.
 */
export function erroresPaso1(persona: string, cedula: string): ErroresPaso1 {
  const errores: ErroresPaso1 = {}
  const nombre = persona.replace(/[<>]/g, '').trim()
  if (nombre.length < 2 || nombre.length > 80) errores.persona = 'checkout.errores.nombreRequerido'
  const digitos = cedula.replace(/\D/g, '')
  if (!digitos) errores.cedula = 'checkout.errores.cedulaRequerida'
  else if (digitos.length < 9 || digitos.length > 12) errores.cedula = AVISO_CEDULA_FORMATO
  return errores
}

/** Errores por campo que manda el backend en un 400 (`data.campos`). */
export function camposDelError(err: unknown): ErroresPaso1 {
  const campos = err && typeof err === 'object' && 'response' in err
    ? (err as { response?: { data?: { data?: { campos?: unknown } } } }).response?.data?.data?.campos
    : undefined
  if (!campos || typeof campos !== 'object') return {}
  const c = campos as Record<string, unknown>
  const r: ErroresPaso1 = {}
  if (typeof c.persona === 'string') r.persona = c.persona
  if (typeof c.cedula === 'string') r.cedula = c.cedula
  return r
}
