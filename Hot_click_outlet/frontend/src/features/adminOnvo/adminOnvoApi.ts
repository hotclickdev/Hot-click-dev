import api from '@/services/api'

/**
 * S2-29 / S3-22 · Sección ONVO del admin. La lista y la ficha (`/api/plataforma/onvo/negocios`) siguen SUPUESTAS:
 * Backend las deja para un PR siguiente a #197 (la tabla V183 ya trae pct_comision, frecuencia_pendiente y onvo_account_id).
 *
 *   GET  /api/plataforma/onvo/negocios?estado=   → { conciliadoEl: string|null, negocios: NegocioOnvo[] }
 *   GET  /api/plataforma/onvo/negocios/{id}      → NegocioOnvoDetalle
 *   POST /api/plataforma/onvo/negocios/{id}/registrar
 *   POST /api/plataforma/onvo/negocios/{id}/reenviar-enlace
 *   PUT  /api/plataforma/onvo/negocios/{id}/comision   { porcentaje }
 * REAL (master, #154): pausar y reanudar los cobros en línea usan el endpoint del admin de empresas:
 *   PUT  /api/admin/empresas/{id}/cobros-pausados      { cobrosPausados: true|false, motivo? }  (solo ADMIN)
 *        → 200 { success, message, data: { cobrosPausados } }; 400 si falta el booleano o si `motivo` no tiene 3 a 300 caracteres.
 *   Con #197 el backend guarda `motivo` al pausar, lo borra al reanudar y lo devuelve como `motivoPausa` en /api/negocio/onvo/estado.
 * Errores: el backend traduce la respuesta de ONVO a un `codigo` (ver erroresOnvo.ts); la UI nunca muestra el código.
 * IBAN: solo llega enmascarado (últimos 4) desde el backend; el front no lo desenmascara.
 * Los porcentajes del plan llegan del backend (`porcentajePlan`); el front no los escribe.
 */
export type EstadoOnvo = 'SIN_CUENTA' | 'ONBOARDING_PENDIENTE' | 'EN_REVISION' | 'ACTIVA' | 'PAUSADA' | 'SUSPENDIDA'
export type Conciliacion = 'CUADRA' | 'DIFERENCIA' | 'SIN_DATOS'

export type NegocioOnvo = {
  id: number
  nombre: string
  plan: string
  porcentajeOnvo: number | null
  porcentajePlan: number | null
  estado: EstadoOnvo
  conciliacion: Conciliacion
}

export type NegocioOnvoDetalle = NegocioOnvo & {
  correo: string | null
  cuentaOnvo: string | null
  ibanEnmascarado: string | null
  frecuencia: 'QUINCENAL' | 'MENSUAL' | null
  frecuenciaPendiente: 'QUINCENAL' | 'MENSUAL' | null
}

export type ListaNegociosOnvo = { conciliadoEl: string | null; negocios: NegocioOnvo[] }

function cuerpo<T>(data: unknown): T {
  return (data && typeof data === 'object' && 'data' in data ? (data as { data: unknown }).data : data) as T
}

const base = '/plataforma/onvo/negocios'
const cobrosPausados = (id: number) => `/admin/empresas/${id}/cobros-pausados`

export const adminOnvoApi = {
  listar: (estado?: string) => api.get(base, { params: estado ? { estado } : undefined }).then((r) => cuerpo<ListaNegociosOnvo>(r.data)),
  detalle: (id: number | string) => api.get(`${base}/${id}`).then((r) => cuerpo<NegocioOnvoDetalle>(r.data)),
  registrar: (id: number) => api.post(`${base}/${id}/registrar`).then(() => undefined),
  reenviarEnlace: (id: number) => api.post(`${base}/${id}/reenviar-enlace`).then(() => undefined),
  cambiarComision: (id: number, porcentaje: number) => api.put(`${base}/${id}/comision`, { porcentaje }).then(() => undefined),
  pausar: (id: number, motivo: string) => api.put(cobrosPausados(id), { cobrosPausados: true, motivo }).then(() => undefined),
  reanudar: (id: number) => api.put(cobrosPausados(id), { cobrosPausados: false }).then(() => undefined),
}
