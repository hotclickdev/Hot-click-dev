import api from '@/services/api'

/**
 * S6-20 · Banner «Ya podés cobrar en línea» — CONTRATO SUPUESTO (backend ONVO marketplace).
 *   GET /api/empresa/onvo/estado → { estado: 'SIN_REGISTRAR'|'PENDIENTE'|'ACTIVA'|'PAUSADA'|'RECHAZADA' }
 * Si el endpoint real se llama distinto, solo cambia esta capa. Si falla, no se muestra nada.
 * El banner se cierra por negocio y queda guardado en localStorage (solo una bandera, sin datos personales).
 */
export type EstadoOnvo = 'SIN_REGISTRAR' | 'PENDIENTE' | 'ACTIVA' | 'PAUSADA' | 'RECHAZADA'
const ESTADOS: EstadoOnvo[] = ['SIN_REGISTRAR', 'PENDIENTE', 'ACTIVA', 'PAUSADA', 'RECHAZADA']

export function normalizarEstadoOnvo(data: unknown): EstadoOnvo | null {
  const root = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
  const d = (root.data && typeof root.data === 'object' ? root.data : root) as Record<string, unknown>
  const e = typeof d.estado === 'string' ? d.estado.toUpperCase() : ''
  return (ESTADOS as string[]).includes(e) ? (e as EstadoOnvo) : null
}

export const bannerCobrosApi = {
  estado: () => api.get('/empresa/onvo/estado').then((r) => normalizarEstadoOnvo(r.data)),
}

export const claveCerrado = (empresaId: string | number) => `hc.bannerCobros.cerrado.${empresaId}`

export function debeMostrarBanner(p: { estadoEmpresa?: string | null; visibilidadPublica?: boolean | null; estadoOnvo: EstadoOnvo | null; cerrado: boolean }): boolean {
  return p.estadoEmpresa === 'ACTIVO' && p.visibilidadPublica !== false && p.estadoOnvo === 'ACTIVA' && !p.cerrado
}

/** «Ver mis cobros» abre Mis ventas (S4-23, ruta ventas-semana) dentro del panel actual. */
export function rutaMisCobros(pathname: string): string {
  const seg = pathname.split('/').filter(Boolean)[0] ?? 'emprendedor'
  return `/${seg}/ventas-semana`
}
