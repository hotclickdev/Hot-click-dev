import api from '@/services/api'

/**
 * S2-29 / S3-22 · Sección ONVO del admin — CONTRATO SUPUESTO (sin backend todavía; S3-07 y ramas feat/s2-*).
 *
 *   GET  /api/plataforma/onvo/negocios?estado=   → { conciliadoEl: string|null, negocios: NegocioOnvo[] }
 *   GET  /api/plataforma/onvo/negocios/{id}      → NegocioOnvoDetalle
 *   POST /api/plataforma/onvo/negocios/{id}/registrar
 *   POST /api/plataforma/onvo/negocios/{id}/reenviar-enlace
 *   PUT  /api/plataforma/onvo/negocios/{id}/comision   { porcentaje }
 *   POST /api/plataforma/onvo/negocios/{id}/pausar     { motivo }   (motivo de 3+ caracteres, como cambiarEstado)
 *   POST /api/plataforma/onvo/negocios/{id}/reanudar
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

export const adminOnvoApi = {
  listar: (estado?: string) => api.get(base, { params: estado ? { estado } : undefined }).then((r) => cuerpo<ListaNegociosOnvo>(r.data)),
  detalle: (id: number | string) => api.get(`${base}/${id}`).then((r) => cuerpo<NegocioOnvoDetalle>(r.data)),
  registrar: (id: number) => api.post(`${base}/${id}/registrar`).then(() => undefined),
  reenviarEnlace: (id: number) => api.post(`${base}/${id}/reenviar-enlace`).then(() => undefined),
  cambiarComision: (id: number, porcentaje: number) => api.put(`${base}/${id}/comision`, { porcentaje }).then(() => undefined),
  pausar: (id: number, motivo: string) => api.post(`${base}/${id}/pausar`, { motivo }).then(() => undefined),
  reanudar: (id: number) => api.post(`${base}/${id}/reanudar`).then(() => undefined),
}
