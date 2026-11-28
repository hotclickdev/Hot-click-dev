import api from './api'

export type EstadoEnlace = 'CREADO' | 'PAGADO' | 'EXPIRADO' | 'CANCELADO'

export type EnlacePago = {
  id: number
  empresaId: number
  montoCrc: number
  motivo: string
  estado: EstadoEnlace
  /** Solo viene mientras el enlace está abierto. */
  url: string | null
  creadoEn: string
  pagadoEn: string | null
  cerradoEn: string | null
}

export type ComisionOnvo = {
  efectivoPct: number
  enviadoPct: number | null
  enviadoEn: string | null
  pendiente: boolean
  tieneCuenta: boolean
  ultimoError: string | null
}

/** Interruptores del cobro por ONVO: apagados hasta validar con el sandbox de ONVO. */
export type InterruptoresOnvo = { cobroANombreNegocio: boolean; enlacesPago: boolean }

export type AvisoEnlace = { id: number; montoCrc: number; motivo: string; url: string }

export const onvoCobroService = {
  /** Solo ADMIN. */
  comision: (empresaId: string | number) => api.get(`/admin/empresas/${empresaId}/onvo/comision`),
  sincronizar: (empresaId: string | number) => api.post(`/admin/empresas/${empresaId}/onvo/comision/sincronizar`),
  enlaces: (empresaId: string | number) => api.get(`/admin/empresas/${empresaId}/onvo/enlaces-pago`),
  crearEnlace: (empresaId: string | number, montoCrc: number, motivo: string) =>
    api.post(`/admin/empresas/${empresaId}/onvo/enlaces-pago`, { montoCrc, motivo }),
  cancelarEnlace: (enlaceId: number) => api.post(`/admin/onvo/enlaces-pago/${enlaceId}/cancelar`),
  interruptores: () => api.get('/admin/configuracion/onvo-cobro'),
  guardarInterruptores: (valores: InterruptoresOnvo) => api.put('/admin/configuracion/onvo-cobro', valores),
  /** Negocio: sus enlaces abiertos (la empresa sale de la sesión). */
  abiertos: () => api.get('/empresa/enlaces-pago/abiertos'),
}
