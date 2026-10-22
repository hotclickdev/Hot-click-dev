import api from '@/services/api'

/**
 * S2-28 · Frecuencia de liquidación. Contrato real de #197 (c5fb0f050, `docs/contratos/S3-06-onvo-estado-frecuencia.md`):
 * sin valor por defecto (decisión del dueño): `actual` es `null` hasta que el negocio elige; el PUT exige `frecuencia`
 * (ausente/vacía/inválida → 400 `FRECUENCIA_INVALIDA`); personal → 403 `SOLO_PROPIETARIO`. Nunca se manda una frecuencia vacía.
 *   GET /api/negocio/onvo/frecuencia → { actual: 'QUINCENAL'|'MENSUAL'|null, pendiente: 'QUINCENAL'|'MENSUAL'|null }
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
