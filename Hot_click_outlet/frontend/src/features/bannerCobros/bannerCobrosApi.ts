import api from '@/services/api'

/**
 * S6-20 · Banner «Ya podés cobrar en línea». Contrato real de #197 (`docs/contratos/S3-06-onvo-estado-frecuencia.md`):
 *   GET /api/negocio/onvo/estado (alias /api/empresa/onvo/estado) →
 *     { estado: 'SIN_CUENTA'|'ONBOARDING_PENDIENTE'|'EN_REVISION'|'ACTIVA'|'PAUSADA'|'SUSPENDIDA', frecuencia, pausadaEl, motivoPausa }
 * Mismo enum que S2-25. Solo el propietario lo puede leer (el personal recibe 403): si falla, no se muestra nada.
 * El banner se cierra por negocio y queda guardado en localStorage (solo una bandera, sin datos personales).
 */
export type EstadoOnvo = 'SIN_CUENTA' | 'ONBOARDING_PENDIENTE' | 'EN_REVISION' | 'ACTIVA' | 'PAUSADA' | 'SUSPENDIDA'
const ESTADOS: EstadoOnvo[] = ['SIN_CUENTA', 'ONBOARDING_PENDIENTE', 'EN_REVISION', 'ACTIVA', 'PAUSADA', 'SUSPENDIDA']

export function normalizarEstadoOnvo(data: unknown): EstadoOnvo | null {
  const root = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
  const d = (root.data && typeof root.data === 'object' ? root.data : root) as Record<string, unknown>
  const e = typeof d.estado === 'string' ? d.estado.toUpperCase() : ''
  return (ESTADOS as string[]).includes(e) ? (e as EstadoOnvo) : null
}

export const bannerCobrosApi = {
  estado: () => api.get('/negocio/onvo/estado').then((r) => normalizarEstadoOnvo(r.data)),
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
