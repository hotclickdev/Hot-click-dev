import api from './api'
import type { Id } from '@/types/api'

export type InventarioMatch =
  | 'EN_PAQUETE'
  | 'EN_EMPRESA'
  | 'EN_MAESTRO'
  | 'NUEVO'

export type InventarioLookup = {
  match: InventarioMatch
  barcode?: string | null
  nombre?: string | null
  imagenUrl?: string | null
  marcaTexto?: string | null
  productoId?: Id | null
  lineaId?: Id | null
  stockActual?: number | null
  precioVenta?: number | null
}

export type PaqueteLinea = {
  id: Id
  barcode?: string | null
  sku?: string | null
  nombre: string
  precioCompra: number
  precioVenta: number
  stock: number
  marcaTexto?: string | null
  categoriaTexto?: string | null
  imagenUrl?: string | null
  estado: string
  productoId?: Id | null
  notasConflicto?: string | null
}

export type PaqueteInventario = {
  id: Id
  codigo: string
  empresaId?: Id | null
  empresaNombre?: string | null
  nombreNegocioTemporal?: string | null
  estado: string
  notas?: string | null
  creadoPorNombre?: string | null
  fechaCreacion?: string | null
  fechaCierre?: string | null
  fechaAsignacion?: string | null
  totalLineas: number
  lineas?: PaqueteLinea[]
}

export type LineaRequest = {
  barcode?: string | null
  sku?: string | null
  nombre: string
  precioCompra?: number
  precioVenta?: number
  stock?: number
  marcaTexto?: string | null
  categoriaTexto?: string | null
  imagenUrl?: string | null
  estado?: string
  notasConflicto?: string | null
}

export type ImportarResultado = {
  validas: number
  creadas?: number
  actualizadas?: number
  errores: string[]
}

/** Tras el interceptor, axios.data ya es el payload interno de ResponseDTO. */
export const inventarioPaqueteService = {
  listar: () => api.get<PaqueteInventario[]>('/inventario/paquetes'),

  obtener: (id: Id) => api.get<PaqueteInventario>(`/inventario/paquetes/${id}`),

  crear: (body: { empresaId?: Id | null; nombreNegocioTemporal?: string | null; notas?: string }) =>
    api.post<PaqueteInventario>('/inventario/paquetes', body),

  agregarLinea: (paqueteId: Id, body: LineaRequest) =>
    api.post<PaqueteLinea>(`/inventario/paquetes/${paqueteId}/lineas`, body),

  actualizarLinea: (paqueteId: Id, lineaId: Id, body: LineaRequest) =>
    api.put<PaqueteLinea>(`/inventario/paquetes/${paqueteId}/lineas/${lineaId}`, body),

  eliminarLinea: (paqueteId: Id, lineaId: Id) =>
    api.delete(`/inventario/paquetes/${paqueteId}/lineas/${lineaId}`),

  cerrar: (id: Id) =>
    api.post<PaqueteInventario>(`/inventario/paquetes/${id}/cerrar`),

  reabrir: (id: Id) =>
    api.post<PaqueteInventario>(`/inventario/paquetes/${id}/reabrir`),

  asignar: (id: Id, empresaId: Id) =>
    api.post<PaqueteInventario>(`/inventario/paquetes/${id}/asignar`, { empresaId }),

  lookup: (barcode: string, paqueteId?: Id | null) =>
    api.get<InventarioLookup>('/inventario/lookup', {
      params: { barcode, paqueteId: paqueteId ?? undefined },
    }),

  subirImagen: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post<{ url: string }>('/inventario/imagen', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  importarPreview: (paqueteId: Id, lineas: LineaRequest[]) =>
    api.post<ImportarResultado>(`/inventario/paquetes/${paqueteId}/importar/preview`, lineas),

  importarConfirmar: (paqueteId: Id, lineas: LineaRequest[]) =>
    api.post<ImportarResultado>(`/inventario/paquetes/${paqueteId}/importar/confirmar`, lineas),
}
