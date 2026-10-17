/**
 * Códigos de error estables de los contratos de Backend (`docs/contratos/`).
 * - 501 `PENDIENTE_DECISION_DUENO` (#202): la ruta existe, pero la regla espera una decisión del dueño de HotClick.
 * - 403 `SIN_ACCESO_NEGOCIO` (#201): la persona no es miembro activo de ese negocio.
 * La respuesta de error es `{ success: false, code, message }`. El front nunca inventa montos ni plazos.
 */
export const CODIGO_PENDIENTE_DUENO = 'PENDIENTE_DECISION_DUENO'
export const CODIGO_SIN_ACCESO_NEGOCIO = 'SIN_ACCESO_NEGOCIO'

export const TEXTO_PENDIENTE_DUENO = 'Todavía no disponible. Esta parte espera una decisión de HotClick; volvé a revisar más adelante.'
export const TEXTO_SIN_ACCESO_NEGOCIO = 'No tenés acceso a este negocio. Elegí otro o pedile acceso a quien lo administra.'

type RespuestaError = { status?: number; data?: unknown }

function respuesta(err: unknown): RespuestaError | undefined {
  if (!err || typeof err !== 'object' || !('response' in err)) return undefined
  const r = (err as { response?: unknown }).response
  return r && typeof r === 'object' ? (r as RespuestaError) : undefined
}

export function estadoError(err: unknown): number | undefined {
  const s = respuesta(err)?.status
  return typeof s === 'number' ? s : undefined
}

export function codigoError(err: unknown): string | null {
  const d = respuesta(err)?.data
  const code = d && typeof d === 'object' ? (d as { code?: unknown }).code : undefined
  return typeof code === 'string' && code ? code : null
}

export function esPendienteDueno(err: unknown): boolean {
  return codigoError(err) === CODIGO_PENDIENTE_DUENO || estadoError(err) === 501
}

export function esSinAccesoNegocio(err: unknown): boolean {
  return codigoError(err) === CODIGO_SIN_ACCESO_NEGOCIO
}

/** Texto para los errores de contrato conocidos; `null` si es otro error (la pantalla usa el suyo). */
export function mensajeErrorContrato(err: unknown): string | null {
  if (esPendienteDueno(err)) return TEXTO_PENDIENTE_DUENO
  if (esSinAccesoNegocio(err)) return TEXTO_SIN_ACCESO_NEGOCIO
  return null
}
