import api from '@/services/api'

/**
 * S5-24 · Resumen de textos legales (DIS-4) — CONTRATO SUPUESTO.
 *   GET /api/public/legal/{documento}/resumen → { aprobado: boolean, version: string, puntos: string[] }
 *   GET /api/admin/legal/{documento}/resumen  → { aprobado, version, puntos, aprobadoPor: string|null, aprobadoEl: string|null }
 * El resumen se muestra solo si Legal lo aprobó para ESA versión; si cambia el texto completo, vuelve a ocultarse
 * (lo decide el backend). Los textos los redacta y aprueba Legal: el front no trae ninguno escrito.
 */
export type DocumentoLegal = 'terminos' | 'privacidad' | 'devoluciones'
export type ResumenLegal = { aprobado: boolean; version: string | null; puntos: string[]; aprobadoPor: string | null; aprobadoEl: string | null }

export function normalizarResumen(data: unknown): ResumenLegal {
  const d = ((data && typeof data === 'object' && 'data' in data ? (data as { data: unknown }).data : data) ?? {}) as Record<string, unknown>
  const puntos = Array.isArray(d.puntos) ? d.puntos.filter((p): p is string => typeof p === 'string' && p.trim() !== '') : []
  const txt = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null)
  return { aprobado: d.aprobado === true, version: txt(d.version), puntos, aprobadoPor: txt(d.aprobadoPor), aprobadoEl: txt(d.aprobadoEl) }
}

/** Se publica solo aprobado y con puntos. */
export const resumenVisible = (r: ResumenLegal | null) => !!r && r.aprobado && r.puntos.length > 0

export const resumenLegalApi = {
  publico: (doc: DocumentoLegal) => api.get(`/public/legal/${doc}/resumen`).then((r) => normalizarResumen(r.data)),
  admin: (doc: DocumentoLegal) => api.get(`/admin/legal/${doc}/resumen`).then((r) => normalizarResumen(r.data)),
}
