import api from '@/services/api'

/**
 * S5-23 · Contracargos (admin) — CONTRATO SUPUESTO (webhook de disputas de ONVO).
 *   GET    /api/admin/contracargos                → [{ id, numero, tienda, estado, monto, venceEl }]
 *   GET    /api/admin/contracargos/{id}           → { id, numero, tienda, estado: 'ABIERTO'|'ENVIADO'|'GANADO'|'PERDIDO',
 *            monto, retencion: { monto: number, moneda: 'USD'|'CRC' } | null, venceEl, resueltoEl, respondidoEl,
 *            pruebas: [{ id, nombre }] }
 *   POST   /api/admin/contracargos/{id}/pruebas   multipart `archivo` (PDF o imagen; almacenamiento privado)
 *   DELETE /api/admin/contracargos/{id}/pruebas/{pruebaId}
 *   POST   /api/admin/contracargos/{id}/responder
 * Plazo y retención los informa ONVO (S5-05): llegan del backend; el front no escribe ni plazo ni monto. Rutas reales en #202 (501 `PENDIENTE_DECISION_DUENO` hasta entonces). Sin monto: «monto a definir por HOT_CLICK».
 * Pendiente (S5-05): quién asume el contracargo.
 */
export type EstadoContracargo = 'ABIERTO' | 'ENVIADO' | 'GANADO' | 'PERDIDO'
export type Contracargo = {
  id: string; numero: string; tienda: string; estado: EstadoContracargo; monto: number | null
  retencion: { monto: number; moneda: 'USD' | 'CRC' } | null
  venceEl: string | null; resueltoEl: string | null; respondidoEl: string | null; pruebas: { id: string; nombre: string }[]
}

const ESTADOS: EstadoContracargo[] = ['ABIERTO', 'ENVIADO', 'GANADO', 'PERDIDO']
const cuerpo = (d: unknown) => (d && typeof d === 'object' && 'data' in d ? (d as { data: unknown }).data : d)

export function normalizarContracargo(data: unknown): Contracargo {
  const d = (cuerpo(data) ?? {}) as Record<string, unknown>
  const t = (v: unknown) => (typeof v === 'string' && v ? v : null)
  const r = d.retencion as { monto?: unknown; moneda?: unknown } | null | undefined
  return {
    id: String(d.id ?? ''), numero: t(d.numero) ?? '', tienda: t(d.tienda) ?? '',
    estado: ESTADOS.includes(d.estado as EstadoContracargo) ? (d.estado as EstadoContracargo) : 'ABIERTO',
    monto: typeof d.monto === 'number' ? d.monto : null,
    retencion: r && typeof r.monto === 'number' ? { monto: r.monto, moneda: r.moneda === 'CRC' ? 'CRC' : 'USD' } : null,
    venceEl: t(d.venceEl), resueltoEl: t(d.resueltoEl), respondidoEl: t(d.respondidoEl),
    pruebas: (Array.isArray(d.pruebas) ? d.pruebas : []).map((p) => ({ id: String((p as { id?: unknown }).id ?? ''), nombre: String((p as { nombre?: unknown }).nombre ?? '') })),
  }
}

const base = '/admin/contracargos'
export const contracargosApi = {
  listar: () => api.get(base).then((r) => { const d = cuerpo(r.data); return (Array.isArray(d) ? d : []).map(normalizarContracargo) }),
  detalle: (id: string) => api.get(`${base}/${id}`).then((r) => normalizarContracargo(r.data)),
  adjuntar: (id: string, archivo: File) => { const f = new FormData(); f.append('archivo', archivo); return api.post(`${base}/${id}/pruebas`, f).then(() => undefined) },
  quitar: (id: string, pruebaId: string) => api.delete(`${base}/${id}/pruebas/${pruebaId}`).then(() => undefined),
  responder: (id: string) => api.post(`${base}/${id}/responder`).then(() => undefined),
}

export const TIPOS_PRUEBA = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
export const pruebaValida = (f: { type: string }) => TIPOS_PRUEBA.includes(f.type)

/** «2 d 05 h 12 min»; null si ya venció o no hay fecha. */
export function cuentaRegresiva(venceEl: string | null, ahora = Date.now()): string | null {
  if (!venceEl) return null
  const ms = Date.parse(venceEl) - ahora
  if (Number.isNaN(ms) || ms <= 0) return null
  const min = Math.floor(ms / 60000)
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60
  return `${d} d ${String(h).padStart(2, '0')} h ${String(m).padStart(2, '0')} min`
}

export function textoRetencion(r: Contracargo['retencion'], fmtCrc: (n: number) => string): string {
  if (!r) return 'monto a definir por HOT_CLICK'
  return r.moneda === 'USD' ? `US$${r.monto}` : fmtCrc(r.monto)
}

export const CHIP: Record<EstadoContracargo, { texto: string; clase: string }> = {
  ABIERTO: { texto: 'Abierto', clase: 'bg-hc-warning-bg text-hc-warning' },
  ENVIADO: { texto: 'Respuesta enviada', clase: 'bg-hc-blue-50 text-hc-blue-600' },
  GANADO: { texto: 'Ganado', clase: 'bg-hc-success-bg text-hc-success-text' },
  PERDIDO: { texto: 'Perdido', clase: 'bg-hc-danger-bg text-hc-danger' },
}
