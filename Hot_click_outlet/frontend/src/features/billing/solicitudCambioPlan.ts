import api from '@/services/api'
import type { Id } from '@/types/api'

/** Orden de planes (igual que el backend): solo se sube a Negocio Plus en línea; bajar es por solicitud. */
export const ORDEN_PLANES = ['EMPRENDEDOR', 'PYME', 'NEGOCIO_PLUS'] as const

export const CODIGO_REQUIERE_SOLICITUD = 'CAMBIO_PLAN_REQUIERE_SOLICITUD'

export const MOTIVO_MIN = 5
export const MOTIVO_MAX = 500

function rango(nombre?: string | null): number {
  return ORDEN_PLANES.indexOf((nombre ?? '').toUpperCase() as (typeof ORDEN_PLANES)[number])
}

/** Bajar desde un plan de pago (a PYME o a Emprendedor): no hay botón directo, va por solicitud. */
export function requiereSolicitud(actual?: string | null, destino?: string | null): boolean {
  const a = rango(actual)
  const d = rango(destino)
  return a > 0 && d >= 0 && d < a
}

export function motivoSolicitudValido(motivo: string): boolean {
  const m = motivo.trim()
  return m.length >= MOTIVO_MIN && m.length <= MOTIVO_MAX
}

/** El backend respondió 422 porque el cambio no se hace solo sobre un plan cobrado. */
export function esRequiereSolicitud(err: unknown): boolean {
  if (typeof err !== 'object' || err === null || !('response' in err)) return false
  const r = (err as { response?: { status?: number; data?: { codigo?: unknown } } }).response
  return r?.status === 422 && r?.data?.codigo === CODIGO_REQUIERE_SOLICITUD
}

export type SolicitudCambioPlanAdmin = {
  id: number
  empresaId: number
  nombreEmpresa?: string | null
  planActual: string
  planSolicitado: string
  motivo: string
  fechaSolicitud?: string | null
  revisada: boolean
  revisadaPor?: number | null
  fechaRevision?: string | null
}

export const solicitudCambioPlanService = {
  solicitar: (planSolicitadoId: Id, motivo: string) =>
    api.post('/billing/solicitud-cambio-plan', { planSolicitadoId, motivo: motivo.trim() }),
  listar: () => api.get('/admin/solicitudes-cambio-plan'),
  revisar: (id: number) => api.post(`/admin/solicitudes-cambio-plan/${id}/revisar`),
}

/** Saca la lista de ResponseDTO { data: [...] } sin confiar en la forma. */
export function solicitudesDe(body: unknown): SolicitudCambioPlanAdmin[] {
  const data = (body as { data?: unknown })?.data
  return Array.isArray(data) ? (data as SolicitudCambioPlanAdmin[]).filter((s) => typeof s?.id === 'number') : []
}
