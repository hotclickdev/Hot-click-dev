/** Helpers puros del listado de auditoría admin. */

export const DIAS_RETENCION_AUDITORIA = 90

export function etiquetaAccion(accion: string): string {
  const map: Record<string, string> = {
    APROBAR_SINPE: 'Aprobar SINPE',
    RECHAZAR_SINPE: 'Rechazar SINPE',
    AUTO_APROBAR_SINPE: 'Auto-aprobar SINPE',
    IMPERSONACION_INICIO: 'Impersonar negocio',
    IMPERSONACION_FIN: 'Salir impersonación',
    SUSPENDER_EMPRESA: 'Suspender empresa',
    REACTIVAR_EMPRESA: 'Reactivar empresa',
  }
  return map[accion] ?? accion.replaceAll('_', ' ')
}

export function fmtFechaAuditoria(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('es-CR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d)
}

export function paginaAuditoria(data: unknown): {
  content: unknown[]
  totalElements: number
  totalPages: number
  page: number
  diasRetencion: number
} {
  const inner = data && typeof data === 'object' && 'data' in data
    ? (data as { data: unknown }).data
    : data
  if (!inner || typeof inner !== 'object') {
    return { content: [], totalElements: 0, totalPages: 0, page: 0, diasRetencion: DIAS_RETENCION_AUDITORIA }
  }
  const o = inner as Record<string, unknown>
  const content = Array.isArray(o.content) ? o.content : []
  return {
    content,
    totalElements: typeof o.totalElements === 'number' ? o.totalElements : 0,
    totalPages: typeof o.totalPages === 'number' ? o.totalPages : 0,
    page: typeof o.page === 'number' ? o.page : 0,
    diasRetencion: typeof o.diasRetencion === 'number' ? o.diasRetencion : DIAS_RETENCION_AUDITORIA,
  }
}

export function listaTipos(data: unknown): string[] {
  const inner = data && typeof data === 'object' && 'data' in data
    ? (data as { data: unknown }).data
    : data
  return Array.isArray(inner) ? inner.filter((x): x is string => typeof x === 'string') : []
}
