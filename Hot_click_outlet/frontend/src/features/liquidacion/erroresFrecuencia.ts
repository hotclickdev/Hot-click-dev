import { codigoError, estadoError, mensajeErrorContrato } from '@/utils/erroresContrato'

/**
 * Errores de `GET/PUT /api/negocio/onvo/frecuencia` (contrato de #197, c5fb0f050): frecuencia ausente, vacía o inválida →
 * 400 `FRECUENCIA_INVALIDA`; personal o sesión de soporte → 403 `SOLO_PROPIETARIO`. Cualquier 400/403 se muestra igual
 * aunque falte el `code`.
 */
export const CODIGO_FRECUENCIA_INVALIDA = 'FRECUENCIA_INVALIDA'
export const CODIGO_SOLO_PROPIETARIO = 'SOLO_PROPIETARIO'
export const TEXTO_FRECUENCIA_NO_DISPONIBLE = 'Esta opción todavía no está disponible. Muy pronto vas a poder cambiarla desde acá.'
export const TEXTO_FRECUENCIA_SOLO_PROPIETARIO = 'Solo la persona dueña del negocio puede ver y cambiar la frecuencia de liquidación.'
export const TEXTO_FRECUENCIA_INVALIDA = 'Elegí quincenal o mensual.'
export const TEXTO_FRECUENCIA_NO_GUARDADA = 'No se pudo guardar. Intentá de nuevo en un momento.'

export function mensajeErrorCargaFrecuencia(err: unknown): string {
  if (codigoError(err) === CODIGO_SOLO_PROPIETARIO || estadoError(err) === 403) return TEXTO_FRECUENCIA_SOLO_PROPIETARIO
  return mensajeErrorContrato(err) ?? TEXTO_FRECUENCIA_NO_DISPONIBLE
}

export function mensajeErrorGuardarFrecuencia(err: unknown): string {
  if (codigoError(err) === CODIGO_FRECUENCIA_INVALIDA || estadoError(err) === 400) return TEXTO_FRECUENCIA_INVALIDA
  if (codigoError(err) === CODIGO_SOLO_PROPIETARIO || estadoError(err) === 403) return TEXTO_FRECUENCIA_SOLO_PROPIETARIO
  return mensajeErrorContrato(err) ?? TEXTO_FRECUENCIA_NO_GUARDADA
}
