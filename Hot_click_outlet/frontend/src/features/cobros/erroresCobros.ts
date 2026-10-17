import { codigoError, estadoError, mensajeErrorContrato } from '@/utils/erroresContrato'

/**
 * Contrato real #197 (`docs/contratos/S3-06-onvo-estado-frecuencia.md`): `/api/negocio/onvo/*` es solo para
 * el propietario del negocio; el personal (o una sesión de soporte) recibe 403 `SOLO_PROPIETARIO`.
 */
export const CODIGO_SOLO_PROPIETARIO = 'SOLO_PROPIETARIO'
export const TEXTO_SOLO_PROPIETARIO = 'Solo la persona dueña del negocio puede ver y activar los cobros en línea.'
export const TEXTO_ESTADO_NO_DISPONIBLE = 'Todavía no podemos mostrar el estado de tus cobros. Probá de nuevo en un rato.'

export function mensajeErrorEstadoCobros(err: unknown): string {
  const contrato = mensajeErrorContrato(err)
  if (contrato) return contrato
  // Un 403 sin `code` (backend anterior) se trata igual: en esta ruta solo lo recibe quien no es propietario.
  return codigoError(err) === CODIGO_SOLO_PROPIETARIO || estadoError(err) === 403 ? TEXTO_SOLO_PROPIETARIO : TEXTO_ESTADO_NO_DISPONIBLE
}
