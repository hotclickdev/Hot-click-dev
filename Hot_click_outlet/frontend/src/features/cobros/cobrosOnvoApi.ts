import api from '@/services/api'

/**
 * S2-25 · Activar cobros con ONVO. Todo el acceso al servidor queda acá.
 * GET /estado: contrato real de #197 (`docs/contratos/S3-06-onvo-estado-frecuencia.md`, alias /api/empresa/onvo/*);
 * solo el propietario (el personal recibe 403). POST /activar, /enlace y /reenviar-enlace siguen SUPUESTOS:
 * Backend los deja para cuando exista OnvoMarketplaceClient (S2-13) y las llaves sandbox (S2-01).
 *
 *   GET  /api/negocio/onvo/estado          → { estado, frecuencia, pausadaEl? }
 *   POST /api/negocio/onvo/activar         → { url }   (HotClick crea la cuenta y devuelve el enlace de onboarding)
 *   POST /api/negocio/onvo/enlace          → { url }   (enlace vigente para «Continuar en ONVO»)
 *   POST /api/negocio/onvo/reenviar-enlace → 204       (ONVO manda un enlace nuevo al correo)
 *
 * El front nunca recibe ni muestra el IBAN ni datos del KYC: son de ONVO.
 */
export const ESTADOS_COBRO = ['SIN_CUENTA', 'ONBOARDING_PENDIENTE', 'EN_REVISION', 'ACTIVA', 'PAUSADA', 'SUSPENDIDA'] as const
export type EstadoCobro = (typeof ESTADOS_COBRO)[number]
export type FrecuenciaLiquidacion = 'QUINCENAL' | 'MENSUAL'

export type CuentaCobros = { estado: EstadoCobro; frecuencia: FrecuenciaLiquidacion | null; pausadaEl: string | null }

function cuerpo<T>(data: unknown): T {
  return (data && typeof data === 'object' && 'data' in data ? (data as { data: unknown }).data : data) as T
}

export function normalizarCuenta(data: unknown): CuentaCobros {
  const d = cuerpo<Partial<CuentaCobros> | null>(data)
  const estado = ESTADOS_COBRO.includes(d?.estado as EstadoCobro) ? (d?.estado as EstadoCobro) : 'SIN_CUENTA'
  const frecuencia = d?.frecuencia === 'QUINCENAL' || d?.frecuencia === 'MENSUAL' ? d.frecuencia : null
  return { estado, frecuencia, pausadaEl: typeof d?.pausadaEl === 'string' ? d.pausadaEl : null }
}

function url(data: unknown): string | null {
  const u = cuerpo<{ url?: unknown } | null>(data)?.url
  return typeof u === 'string' && /^https:\/\//.test(u) ? u : null
}

export const cobrosOnvoApi = {
  estado: () => api.get('/negocio/onvo/estado').then((r) => normalizarCuenta(r.data)),
  activar: () => api.post('/negocio/onvo/activar').then((r) => url(r.data)),
  enlace: () => api.post('/negocio/onvo/enlace').then((r) => url(r.data)),
  reenviarEnlace: () => api.post('/negocio/onvo/reenviar-enlace').then(() => undefined),
}
