import { PROVINCIAS_CR, cantonesDe } from '@/utils/divisionTerritorialCR'
import { sinTildes } from '@/utils/divisionTerritorialOficial'

/** Ubicación de despacho de una bodega: sin provincia, cantón y dirección el negocio no publica. */
export type UbicacionDespacho = {
  provincia: string
  canton: string
  /** Distrito oficial del IGN. Opcional: un negocio viejo puede no tenerlo. */
  distrito?: string
  direccionExacta: string
  permiteRetiroCliente: boolean
  latitud?: number | null
  longitud?: number | null
}

export type CampoUbicacionObligatorio = 'provincia' | 'canton' | 'direccionExacta'

export type ErroresUbicacion = Partial<Record<CampoUbicacionObligatorio, string>>

export const UBICACION_INICIAL: UbicacionDespacho = {
  provincia: '',
  canton: '',
  direccionExacta: '',
  permiteRetiroCliente: false,
}

const MENSAJES_UBICACION: Record<CampoUbicacionObligatorio, string> = {
  provincia: 'Elegí la provincia.',
  canton: 'Elegí el cantón.',
  direccionExacta: 'Escribí la dirección exacta.',
}

export const MENSAJE_UBICACION_INCOMPLETA =
  'Completá la ubicación de despacho: provincia, cantón y dirección exacta.'

/** Mismo tope que el backend (`BodegaDespachoInicialService.MAX_DIRECCION_EXACTA`). */
export const MAX_DIRECCION_EXACTA = 255

const MENSAJE_DIRECCION_LARGA = `La dirección no puede superar ${MAX_DIRECCION_EXACTA} caracteres.`

function pertenece(provincia: string, canton: string): boolean {
  const clave = sinTildes(canton)
  return cantonesDe(provincia).some((item) => sinTildes(item) === clave)
}

/** Vale si es de esa provincia, o si el IGN trae un cantón que nuestra lista fija todavía no tiene. */
function cantonValido(ubicacion: UbicacionDespacho): boolean {
  const canton = ubicacion.canton.trim()
  if (!canton || !ubicacion.provincia.trim()) return false
  if (pertenece(ubicacion.provincia, canton)) return true
  return !PROVINCIAS_CR.some((provincia) => pertenece(provincia, canton))
}

function errorDireccion(direccionExacta: string): string | undefined {
  const direccion = direccionExacta.trim()
  if (!direccion) return MENSAJES_UBICACION.direccionExacta
  if (direccion.length > MAX_DIRECCION_EXACTA) return MENSAJE_DIRECCION_LARGA
  return undefined
}

export function erroresUbicacion(ubicacion: UbicacionDespacho): ErroresUbicacion {
  const errores: ErroresUbicacion = {}
  if (!ubicacion.provincia.trim()) errores.provincia = MENSAJES_UBICACION.provincia
  if (!cantonValido(ubicacion)) errores.canton = MENSAJES_UBICACION.canton
  const direccion = errorDireccion(ubicacion.direccionExacta)
  if (direccion) errores.direccionExacta = direccion
  return errores
}

export function ubicacionCompleta(ubicacion: UbicacionDespacho): boolean {
  return Object.keys(erroresUbicacion(ubicacion)).length === 0
}

/** Cambia la provincia y limpia el cantón si no pertenece a la nueva. El distrito se limpia con el cantón. */
export function conProvincia(ubicacion: UbicacionDespacho, provincia: string): UbicacionDespacho {
  const canton = pertenece(provincia, ubicacion.canton) ? ubicacion.canton : ''
  const distrito = canton === ubicacion.canton ? ubicacion.distrito : ''
  return { ...ubicacion, provincia, canton, distrito }
}

/** Cambia el cantón y limpia el distrito, que depende del cantón. */
export function conCanton(ubicacion: UbicacionDespacho, canton: string): UbicacionDespacho {
  return { ...ubicacion, canton, distrito: '' }
}

/** Campos que espera `POST/PUT /api/bodegas` (el backend recibe `Map<String, String>`). */
export function payloadUbicacion(ubicacion: UbicacionDespacho): Record<string, string> {
  const cuerpo: Record<string, string> = {
    provincia: ubicacion.provincia,
    canton: ubicacion.canton,
    direccionExacta: ubicacion.direccionExacta.trim(),
    permiteRetiroCliente: String(ubicacion.permiteRetiroCliente),
  }
  const distrito = ubicacion.distrito?.trim()
  if (distrito) cuerpo.distrito = distrito
  if (pinListo(ubicacion.latitud, ubicacion.longitud)) {
    cuerpo.latitud = String(ubicacion.latitud)
    cuerpo.longitud = String(ubicacion.longitud)
  }
  return cuerpo
}

function pinListo(latitud: number | null | undefined, longitud: number | null | undefined): boolean {
  return typeof latitud === 'number' && Number.isFinite(latitud)
    && typeof longitud === 'number' && Number.isFinite(longitud)
}

/**
 * Campos de ubicación para el alta del negocio (`/auth/registro-empresa`,
 * `/auth/upgrade-emprendedor`, `/auth/nuevo-negocio`): el DTO espera boolean real.
 */
export function payloadUbicacionRegistro(ubicacion: UbicacionDespacho): UbicacionDespacho {
  const cuerpo: UbicacionDespacho = {
    provincia: ubicacion.provincia,
    canton: ubicacion.canton,
    direccionExacta: ubicacion.direccionExacta.trim(),
    permiteRetiroCliente: ubicacion.permiteRetiroCliente,
  }
  const distrito = ubicacion.distrito?.trim()
  if (distrito) cuerpo.distrito = distrito
  return cuerpo
}

/** Si el usuario empezó a llenar la ubicación (en el registro corto es opcional). */
export function ubicacionIniciada(ubicacion: UbicacionDespacho): boolean {
  return Boolean(ubicacion.provincia || ubicacion.canton || ubicacion.direccionExacta.trim() || ubicacion.distrito?.trim())
}
