import api from './api'
import type { SituacionFiscal } from '@/utils/fiscal'

export type InscripcionFiscal = {
  situacion: Extract<SituacionFiscal, 'INSCRITO' | 'REGIMEN_SIMPLIFICADO'>
  cedula: string
  nombre: string
  actividad: string
  correo: string
  /** Declaración jurada: sin aceptarla el servidor responde 400. */
  aceptaDeclaracion: boolean
}

export type ReglasFiscales = {
  regimen: 'SIMPLIFICADO' | 'TRADICIONAL'
  extraNoInscritoPct: number
  diasEnviarFactura: number
  onvoPagoMinimoCrc: number
  onvoCostoPagoCrc: number
}

export const fiscalService = {
  /** Vendedor: su situación fiscal y comisión efectiva (la empresa sale de la sesión). */
  miEstado: () => api.get('/empresa/fiscal'),
  declarar: (situacion: SituacionFiscal) => api.put('/empresa/fiscal/situacion', { situacion }),
  yaMeInscribi: (datos: InscripcionFiscal) => api.post('/empresa/fiscal/inscripcion', datos),
  /** Solo ADMIN. */
  getReglas: () => api.get('/admin/configuracion/fiscal'),
  putReglas: (reglas: ReglasFiscales) => api.put('/admin/configuracion/fiscal', reglas),
  /** Solo ADMIN: verificación de la inscripción de un negocio. */
  pendientes: () => api.get('/admin/empresas/fiscal/pendientes'),
  detalleAdmin: (empresaId: string | number) => api.get(`/admin/empresas/${empresaId}/fiscal`),
  reconsultar: (empresaId: string | number) => api.post(`/admin/empresas/${empresaId}/fiscal/reconsultar`),
  /** `huella` es la del detalle que el ADMIN vio: si el negocio cambió sus datos, el servidor responde 409. */
  verificar: (empresaId: string | number, decision: 'APROBAR' | 'RECHAZAR', huella: string, motivo?: string) =>
    api.post(`/admin/empresas/${empresaId}/fiscal/verificar`, { decision, huella, motivo: motivo || undefined }),
}
