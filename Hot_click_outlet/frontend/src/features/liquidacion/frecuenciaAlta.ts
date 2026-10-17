import type { Frecuencia } from './frecuenciaApi'
import { ERROR_FRECUENCIA_OBLIGATORIA } from './SelectorFrecuencia'

/**
 * Frecuencia de liquidación en el alta del negocio (decisión del dueño, 16-oct-2026): cada negocio elige quincenal o
 * mensual al crearse, sin valor por defecto; cada pago cuesta US$3 (ONVO). Contrato de #197
 * (`docs/contratos/S3-06-onvo-estado-frecuencia.md`): el campo del alta es `frecuenciaLiquidacion` y sin él el backend
 * responde 400 `FRECUENCIA_INVALIDA`. Rutas: `/auth/registro-empresa`, `/auth/upgrade-emprendedor`,
 * `/auth/nuevo-negocio` y `/admin/consola/tiendas-rapidas`. Nunca se manda un valor vacío.
 */
export const CAMPO_FRECUENCIA_ALTA = 'frecuenciaLiquidacion'
export const CODIGO_FRECUENCIA_INVALIDA_ALTA = 'FRECUENCIA_INVALIDA'

export function frecuenciaElegida(valor: unknown): valor is Frecuencia {
  return valor === 'QUINCENAL' || valor === 'MENSUAL'
}

/** Mensaje para mostrar si falta la elección; `null` si ya eligió. */
export function errorFrecuenciaAlta(valor: Frecuencia | null | undefined): string | null {
  return frecuenciaElegida(valor) ? null : ERROR_FRECUENCIA_OBLIGATORIA
}

/** Suma la frecuencia al cuerpo del alta. Sin elección válida no arma el cuerpo (nunca viaja vacía). */
export function conFrecuenciaAlta<T extends object>(payload: T, valor: Frecuencia | null | undefined): T & { frecuenciaLiquidacion: Frecuencia } {
  if (!frecuenciaElegida(valor)) throw new Error('Frecuencia de liquidación sin elegir: no se envía el alta')
  return { ...payload, [CAMPO_FRECUENCIA_ALTA]: valor } as T & { frecuenciaLiquidacion: Frecuencia }
}

/** 400 `FRECUENCIA_INVALIDA` del alta: se muestra junto al selector con el mismo mensaje obligatorio. */
export function esErrorFrecuenciaAlta(err: unknown): boolean {
  if (!err || typeof err !== 'object' || !('response' in err)) return false
  const data = (err as { response?: { data?: unknown } }).response?.data
  return !!data && typeof data === 'object' && (data as { code?: unknown }).code === CODIGO_FRECUENCIA_INVALIDA_ALTA
}
