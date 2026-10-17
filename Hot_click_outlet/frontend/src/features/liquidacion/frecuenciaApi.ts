import api from '@/services/api'

/**
 * S2-28 · Frecuencia de liquidación — CONTRATO SUPUESTO. Backend la está cambiando en #197 (sin valor por defecto;
 * ausente o inválida → 400): no se alinea a los campos de #197 hasta que se estabilice. Nunca se manda una frecuencia vacía.
 *   GET /api/negocio/onvo/frecuencia → { actual: 'QUINCENAL'|'MENSUAL', pendiente: 'QUINCENAL'|'MENSUAL'|null }
 *   PUT /api/negocio/onvo/frecuencia   { frecuencia } → mismo cuerpo, con `pendiente` hasta que el admin lo aplique en ONVO (S2-29)
 * En el registro (paso Cobros) el campo viaja como `frecuenciaLiquidacion` en el alta del negocio;
 * ese cableado queda para cuando el backend lo acepte (el registro lo tiene el Desarrollador).
 * Decisión del dueño: no hay valor por defecto; el negocio elige quincenal o mensual al registrarse.
 * Cada pago de liquidación cuesta US$3 (tarifa de ONVO).
 */
export type Frecuencia = 'QUINCENAL' | 'MENSUAL'
export type EstadoFrecuencia = { actual: Frecuencia | null; pendiente: Frecuencia | null }

function esFrecuencia(v: unknown): v is Frecuencia {
  return v === 'QUINCENAL' || v === 'MENSUAL'
}

export function normalizarFrecuencia(data: unknown): EstadoFrecuencia {
  const d = (data && typeof data === 'object' && 'data' in data ? (data as { data: unknown }).data : data) as Record<string, unknown> | null
  return {
    actual: esFrecuencia(d?.actual) ? d.actual : null,
    pendiente: esFrecuencia(d?.pendiente) ? d.pendiente : null,
  }
}

export const frecuenciaApi = {
  obtener: () => api.get('/negocio/onvo/frecuencia').then((r) => normalizarFrecuencia(r.data)),
  cambiar: (frecuencia: Frecuencia) => esFrecuencia(frecuencia)
    ? api.put('/negocio/onvo/frecuencia', { frecuencia }).then((r) => normalizarFrecuencia(r.data))
    : Promise.reject(new Error('Frecuencia vacía o inválida: no se envía')),
}
