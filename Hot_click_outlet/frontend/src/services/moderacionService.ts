import api from './api'
import type { Id } from '@/types/api'

export type ModeracionResumen = {
  empresas: number
  ofertas: number
  recolecciones: number
  sinpe: number
  testimonios: number
  payouts: number
  reportesProducto: number
  cuentasCobro: number
  total: number
}

export type ReporteProductoItem = {
  id: Id
  motivo?: string
  detalle?: string | null
  estado?: string
  productoId?: Id
  productoNombre?: string
  imagenUrl?: string | null
  usuarioNombre?: string
  usuarioCorreo?: string
  fechaCreacion?: string
}

function cuerpoResumen(data: unknown): ModeracionResumen {
  const root = data && typeof data === 'object' ? data as { data?: ModeracionResumen } & ModeracionResumen : null
  const inner = root?.data ?? root
  return {
    empresas: Number(inner?.empresas) || 0,
    ofertas: Number(inner?.ofertas) || 0,
    recolecciones: Number(inner?.recolecciones) || 0,
    sinpe: Number(inner?.sinpe) || 0,
    testimonios: Number(inner?.testimonios) || 0,
    payouts: Number(inner?.payouts) || 0,
    reportesProducto: Number(inner?.reportesProducto) || 0,
    cuentasCobro: Number(inner?.cuentasCobro) || 0,
    total: Number(inner?.total) || 0,
  }
}

export const moderacionService = {
  resumen: () => api.get('/admin/moderacion/resumen').then((r) => cuerpoResumen(r.data)),
}

export const MOTIVOS_REPORTE = [
  { id: 'CONTENIDO_INAPROPIADO', label: 'Contenido inapropiado' },
  { id: 'PRODUCTO_FALSO', label: 'Producto falso o engañoso' },
  { id: 'PRECIO_ENGANOSO', label: 'Precio engañoso' },
  { id: 'SPAM', label: 'Spam o publicidad indebida' },
  { id: 'OTRO', label: 'Otro' },
] as const

export const reporteProductoService = {
  crear: (productoId: Id, motivo: string, detalle?: string) =>
    api.post('/reportes-producto', { productoId, motivo, detalle: detalle || null }),
  listarPendientes: () => api.get('/admin/reportes-producto'),
  resolver: (id: Id, estado: 'RESUELTO' | 'DESCARTADO', notasAdmin?: string, pausarProducto?: boolean) =>
    api.put(`/admin/reportes-producto/${id}/resolver`, {
      estado,
      notasAdmin: notasAdmin || null,
      pausarProducto: pausarProducto ? 'true' : 'false',
    }),
}
