import { cantonesDe } from '@/utils/divisionTerritorialCR'

/** Ubicación de despacho de una bodega: sin provincia, cantón y dirección el negocio no publica. */
export type UbicacionDespacho = {
  provincia: string
  canton: string
  direccionExacta: string
  permiteRetiroCliente: boolean
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

function cantonValido(ubicacion: UbicacionDespacho): boolean {
  return cantonesDe(ubicacion.provincia).includes(ubicacion.canton)
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

/** Cambia la provincia y limpia el cantón si no pertenece a la nueva. */
export function conProvincia(ubicacion: UbicacionDespacho, provincia: string): UbicacionDespacho {
  const canton = cantonesDe(provincia).includes(ubicacion.canton) ? ubicacion.canton : ''
  return { ...ubicacion, provincia, canton }
}

/** Campos que espera `POST/PUT /api/bodegas` (el backend recibe `Map<String, String>`). */
export function payloadUbicacion(ubicacion: UbicacionDespacho): Record<string, string> {
  return {
    provincia: ubicacion.provincia,
    canton: ubicacion.canton,
    direccionExacta: ubicacion.direccionExacta.trim(),
    permiteRetiroCliente: String(ubicacion.permiteRetiroCliente),
  }
}

/**
 * Campos de ubicación para el alta del negocio (`/auth/registro-empresa`,
 * `/auth/upgrade-emprendedor`, `/auth/nuevo-negocio`): el DTO espera boolean real.
 */
export function payloadUbicacionRegistro(ubicacion: UbicacionDespacho): UbicacionDespacho {
  return {
    provincia: ubicacion.provincia,
    canton: ubicacion.canton,
    direccionExacta: ubicacion.direccionExacta.trim(),
    permiteRetiroCliente: ubicacion.permiteRetiroCliente,
  }
}
