export type EstadoRecoleccion = 'PENDIENTE' | 'COTIZADA' | 'RECHAZADA' | 'CANCELADA'

export type SolicitudRecoleccion = {
  id: number
  empresaId?: number
  empresaNombre?: string
  zona: string
  direccionRecoleccion: string
  contactoRecoleccion: string
  telefonoRecoleccion: string
  direccionEntrega: string
  contactoEntrega: string
  telefonoEntrega: string
  notas?: string | null
  estado: EstadoRecoleccion | string
  tarifaColones?: number | null
  notasAdmin?: string | null
  fechaCreacion?: string
  fechaCotizacion?: string | null
}

export type RecoleccionCreatePayload = {
  zona: string
  direccionRecoleccion: string
  contactoRecoleccion: string
  telefonoRecoleccion: string
  direccionEntrega: string
  contactoEntrega: string
  telefonoEntrega: string
  notas?: string
}

export const ESTADOS_RECOLECCION = ['PENDIENTE', 'COTIZADA', 'RECHAZADA', 'CANCELADA'] as const

export const ETIQUETA_ESTADO: Record<string, string> = {
  PENDIENTE: 'Pendiente de tarifa',
  COTIZADA: 'Tarifa indicada',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada',
}
