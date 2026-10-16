import api from '@/services/api'

/**
 * S2-28 · Frecuencia de liquidación — CONTRATO SUPUESTO (sin backend todavía; ramas feat/s2-*).
 *   GET /api/negocio/onvo/frecuencia → { actual: 'QUINCENAL'|'MENSUAL', pendiente: 'QUINCENAL'|'MENSUAL'|null }
 *   PUT /api/negocio/onvo/frecuencia   { frecuencia } → mismo cuerpo, con `pendiente` hasta que el admin lo aplique en ONVO (S2-29)
 * En el registro (paso Cobros) el campo viaja como `frecuenciaLiquidacion` en el alta del negocio;
 * ese cableado queda para cuando el backend lo acepte (el registro lo tiene el Desarrollador).
 */
export type Frecuencia = 'QUINCENAL' | 'MENSUAL'
export type EstadoFrecuencia = { actual: Frecuencia; pendiente: Frecuencia | null }

/** Por defecto Quincenal (lo que hace ONVO hoy). Pendiente de confirmar con HOT_CLICK. */
export const FRECUENCIA_POR_DEFECTO: Frecuencia = 'QUINCENAL'

function esFrecuencia(v: unknown): v is Frecuencia {
  return v === 'QUINCENAL' || v === 'MENSUAL'
}

export function normalizarFrecuencia(data: unknown): EstadoFrecuencia {
  const d = (data && typeof data === 'object' && 'data' in data ? (data as { data: unknown }).data : data) as Record<string, unknown> | null
  return {
    actual: esFrecuencia(d?.actual) ? d.actual : FRECUENCIA_POR_DEFECTO,
    pendiente: esFrecuencia(d?.pendiente) ? d.pendiente : null,
  }
}

export const frecuenciaApi = {
  obtener: () => api.get('/negocio/onvo/frecuencia').then((r) => normalizarFrecuencia(r.data)),
  cambiar: (frecuencia: Frecuencia) => api.put('/negocio/onvo/frecuencia', { frecuencia }).then((r) => normalizarFrecuencia(r.data)),
}
