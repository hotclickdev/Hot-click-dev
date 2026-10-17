import { codigoError, estadoError, mensajeErrorContrato } from '@/utils/erroresContrato'

/** Errores de `GET/PUT /api/negocio/onvo/frecuencia` (contrato real de #197). */
export const TEXTO_FRECUENCIA_NO_DISPONIBLE = 'Esta opción todavía no está disponible. Muy pronto vas a poder cambiarla desde acá.'
export const TEXTO_FRECUENCIA_SOLO_PROPIETARIO = 'Solo la persona dueña del negocio puede ver y cambiar la frecuencia de liquidación.'
export const TEXTO_FRECUENCIA_INVALIDA = 'Elegí quincenal o mensual.'
export const TEXTO_FRECUENCIA_NO_GUARDADA = 'No se pudo guardar. Intentá de nuevo en un momento.'

export function mensajeErrorCargaFrecuencia(err: unknown): string {
  if (estadoError(err) === 403) return TEXTO_FRECUENCIA_SOLO_PROPIETARIO
  return mensajeErrorContrato(err) ?? TEXTO_FRECUENCIA_NO_DISPONIBLE
}

export function mensajeErrorGuardarFrecuencia(err: unknown): string {
  if (codigoError(err) === 'FRECUENCIA_INVALIDA') return TEXTO_FRECUENCIA_INVALIDA
  if (estadoError(err) === 403) return TEXTO_FRECUENCIA_SOLO_PROPIETARIO
  return mensajeErrorContrato(err) ?? TEXTO_FRECUENCIA_NO_GUARDADA
}
