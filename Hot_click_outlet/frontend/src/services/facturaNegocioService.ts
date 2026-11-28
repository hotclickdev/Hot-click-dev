import api from './api'

export type EstadoFacturaNegocio = 'PENDIENTE' | 'RECIBIDA' | 'ACEPTADA' | 'RECHAZADA' | 'VENCIDA' | 'NO_APLICA'

export type LineaDesglose = {
  productoId: number | null
  nombre: string | null
  cabys: string | null
  cabysValido: boolean
  cantidad: number
  bruto: number
  monto: number
}

export type FacturaNegocio = {
  id: number
  periodoDesde: string
  periodoHasta: string
  montoCrc: number
  fechaLimite: string
  diasRestantes: number
  estado: EstadoFacturaNegocio
  /** Solo en RECIBIDA: "Recibida, pendiente de revisión de HotClick." */
  mensajeEstado?: string | null
  clave: string | null
  totalFacturaCrc: number | null
  totalIvaCrc: number | null
  errores: string[]
  avisos: string[]
  fechaRecibida: string | null
  respuestaHacienda: string | null
  recordatorios: number
  ultimoRecordatorio: string | null
  mensajeReceptorEstado: string | null
  fechaLimiteMensajeReceptor: string | null
  desglose: LineaDesglose[]
}

export type FacturaNegocioAdmin = FacturaNegocio & {
  empresaId: number
  nombreNegocio: string | null
  cedulaEmisor: string | null
  revisada: boolean
  fechaRevision: string | null
  tieneXml: boolean
  tieneRespuestaHacienda: boolean
  mensajeReceptorDetalle: string | null
}

export type ResumenFacturaHotclick = {
  leCorrespondeFacturar: boolean
  mensajeNoAplica?: string
  pendiente: FacturaNegocio | null
  historial: FacturaNegocio[]
  quincenaEnCurso: {
    periodoDesde: string
    periodoHasta: string
    montoCrc: number
    base: 'NETO' | 'BRUTO'
    fechaLimite: string
    desglose: LineaDesglose[]
  }
  receptor: { nombre: string | null; tipoIdentificacion: string | null; cedula: string | null; correo: string | null }
  diasParaFacturar: number
  regimenHotclick: string
}

export type PaginaFacturasAdmin = { contenido: FacturaNegocioAdmin[]; pagina: number; totalPaginas: number; total: number }

/** Extrae `data` del ResponseDTO del backend. */
export function datosDe<T>(respuesta: unknown): T | null {
  const cuerpo = (respuesta as { data?: { data?: T } })?.data
  return (cuerpo?.data ?? null) as T | null
}

export const facturaNegocioService = {
  /** Negocio: la empresa sale de la sesión. */
  resumen: () => api.get('/empresa/facturas-hotclick'),
  subirXml: (id: number, xml: File, respuesta?: File | null) => {
    const fd = new FormData()
    fd.append('xml', xml)
    if (respuesta) fd.append('respuesta', respuesta)
    return api.post(`/empresa/facturas-hotclick/${id}/xml`, fd)
  },
  /** Solo ADMIN. */
  listar: (filtros: { estado?: string; desde?: string; page?: number; empresaId?: number | string }) =>
    api.get('/admin/facturas-negocio', {
      params: {
        estado: filtros.estado || undefined, desde: filtros.desde || undefined,
        empresaId: filtros.empresaId || undefined, page: filtros.page ?? 0, size: 50,
      },
    }),
  detalle: (id: number) => api.get(`/admin/facturas-negocio/${id}`),
  /** RECIBIDA → ACEPTADA; recién ahí se cancelan los enlaces de cobro atados a esa factura. */
  aprobar: (id: number) => api.post(`/admin/facturas-negocio/${id}/aprobar`),
  rechazar: (id: number, motivo: string) => api.post(`/admin/facturas-negocio/${id}/rechazar`, { motivo }),
  recordar: (id: number) => api.post(`/admin/facturas-negocio/${id}/recordar`),
  generar: () => api.post('/admin/facturas-negocio/generar'),
}
