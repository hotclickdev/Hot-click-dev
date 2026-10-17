import api from '@/services/api'

/**
 * S5-22 · Solicitudes de reembolso (vendedor) — CONTRATO SUPUESTO.
 *   GET  /api/negocio/reembolsos?vista=pendientes|historial →
 *        [{ id, numero, monto, comprador, producto, motivo, estado, vencePronto: boolean, fecha, detalle }]
 *   POST /api/negocio/reembolsos/{id}/aprobar
 *   POST /api/negocio/reembolsos/{id}/rechazar { motivo }   (3+ caracteres)
 * Estados: NUEVA | PENDIENTE | EN_PROCESO | ACREDITADO | RECHAZADO. El plazo de respuesta es
 * «plazo a definir por HOT_CLICK»; qué pasa si vence sin respuesta está pendiente.
 */
export type EstadoSolicitud = 'NUEVA' | 'PENDIENTE' | 'EN_PROCESO' | 'ACREDITADO' | 'RECHAZADO'
export type SolicitudReembolso = { id: string; numero: string; monto: number; comprador: string; producto: string; motivo: string; estado: EstadoSolicitud; vencePronto: boolean; detalle: string | null }

export const PLAZO_POR_DEFINIR = 'plazo a definir por HOT_CLICK'

const ESTADOS: EstadoSolicitud[] = ['NUEVA', 'PENDIENTE', 'EN_PROCESO', 'ACREDITADO', 'RECHAZADO']

export function normalizarSolicitudes(data: unknown): SolicitudReembolso[] {
  const d = (data && typeof data === 'object' && 'data' in data ? (data as { data: unknown }).data : data)
  return (Array.isArray(d) ? d : []).map((x) => {
    const s = (x ?? {}) as Record<string, unknown>
    const t = (v: unknown) => (typeof v === 'string' ? v : '')
    return {
      id: String(s.id ?? ''), numero: t(s.numero), monto: typeof s.monto === 'number' ? s.monto : 0,
      comprador: t(s.comprador), producto: t(s.producto), motivo: t(s.motivo),
      estado: ESTADOS.includes(s.estado as EstadoSolicitud) ? (s.estado as EstadoSolicitud) : 'PENDIENTE',
      vencePronto: s.vencePronto === true, detalle: typeof s.detalle === 'string' && s.detalle ? s.detalle : null,
    }
  })
}

export const solicitudesApi = {
  listar: (vista: 'pendientes' | 'historial') => api.get('/negocio/reembolsos', { params: { vista } }).then((r) => normalizarSolicitudes(r.data)),
  aprobar: (id: string) => api.post(`/negocio/reembolsos/${encodeURIComponent(id)}/aprobar`).then(() => undefined),
  rechazar: (id: string, motivo: string) => api.post(`/negocio/reembolsos/${encodeURIComponent(id)}/rechazar`, { motivo }).then(() => undefined),
}

export const CHIP: Record<EstadoSolicitud | 'VENCE', { texto: string; clase: string }> = {
  VENCE: { texto: 'Vence pronto', clase: 'bg-hc-warning-bg text-hc-warning' },
  NUEVA: { texto: 'Nueva', clase: 'bg-hc-blue-50 text-hc-blue-600' },
  PENDIENTE: { texto: 'Pendiente', clase: 'bg-hc-n-100 text-hc-n-600' },
  EN_PROCESO: { texto: 'En proceso con ONVO', clase: 'bg-hc-blue-50 text-hc-blue-600' },
  ACREDITADO: { texto: 'Acreditado', clase: 'bg-hc-success-bg text-hc-success-text' },
  RECHAZADO: { texto: 'Rechazado', clase: 'bg-hc-danger-bg text-hc-danger' },
}

export const chipDe = (s: SolicitudReembolso) => (s.vencePronto && (s.estado === 'NUEVA' || s.estado === 'PENDIENTE') ? CHIP.VENCE : CHIP[s.estado])

export function textoAlerta(n: number): string | null {
  if (n === 0) return null
  return `${n === 1 ? '1 solicitud vence' : `${n} solicitudes vencen`} pronto. Respondé antes de que termine el plazo (${PLAZO_POR_DEFINIR}).`
}

export const validarMotivoRechazo = (m: string) => (m.trim().length >= 3 ? null : 'Contale al comprador el motivo (al menos 3 caracteres).')
