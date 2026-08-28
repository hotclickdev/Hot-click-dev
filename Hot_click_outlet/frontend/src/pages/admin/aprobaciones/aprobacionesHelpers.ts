import { formatDateTime } from '@/utils/format'
import type { Id } from '@/types/api'
import type { Producto } from '@/types/producto'
import type { EmpresaLista } from '../empresas/empresasHelpers'

export const ESTADO_PENDIENTE = 'PENDIENTE_APROBACION'
export const ESTADO_ACTIVO = 'ACTIVO'
export const ESTADO_SUSPENDIDO = 'SUSPENDIDO'

export type TabAprobacion = 'empresas' | 'productos' | 'ofertas'
export type AccionAprobacion = 'aprobar' | 'rechazar'

export type EmpresaSolicitud = EmpresaLista & {
  adminNombre?: string
  adminCorreo?: string
}

export type StatsAprobacion = {
  pendientes?: number
  activas?: number
  suspendidas?: number
}

export type ProductoPendiente = Pick<Producto, 'imagenUrl' | 'precioVenta' | 'sku' | 'empresaNombre'> & {
  id: Id
  nombreProducto?: string
  usuarioPide?: string
}

export type OfertaPendiente = Pick<Producto, 'imagenUrl' | 'precioVenta' | 'empresaNombre'> & {
  id: Id
  nombreProducto?: string
  porcentajeDescuento?: number | null
  usuarioPide?: string
}

export type ConfirmAprobacion = {
  id: Id
  action: AccionAprobacion
  nombre?: string
}

export const ESTADO_COLOR: Record<string, string> = {
  PENDIENTE_APROBACION: 'bg-yellow-500/15 text-yellow-400',
  ACTIVO: 'bg-green-500/15 text-green-400',
  RECHAZADO: 'bg-red-500/15 text-red-400',
  SUSPENDIDO: 'bg-amber-500/15 text-amber-400',
}

export const SUBTITULO_TAB: Record<TabAprobacion, string> = {
  empresas: 'Negocios nuevos esperando tu aprobación para activarse en la plataforma',
  productos: 'El catálogo se abre al aprobar el negocio. Los productos nuevos de un negocio activo no esperan revisión acá.',
  ofertas: 'Promociones esperando tu aprobación para aplicarse',
}

export function listaDesdeRespuesta<T>(data: unknown): T[] {
  return Array.isArray(data) ? data as T[] : []
}

export function solicitudesPendientes(solicitudes: EmpresaSolicitud[]): EmpresaSolicitud[] {
  return solicitudes.filter((empresa) => empresa.estadoEmpresa === ESTADO_PENDIENTE)
}

export function statsDesdeEmpresas(empresas: EmpresaSolicitud[]): StatsAprobacion {
  return {
    pendientes: empresas.filter((empresa) => empresa.estadoEmpresa === ESTADO_PENDIENTE).length,
    activas: empresas.filter((empresa) => empresa.estadoEmpresa === ESTADO_ACTIVO).length,
    suspendidas: empresas.filter((empresa) => empresa.estadoEmpresa === ESTADO_SUSPENDIDO).length,
  }
}

export function kpisAprobacion(stats: StatsAprobacion): { label: string; value: number; color: string }[] {
  return [
    { label: 'Por aprobar', value: stats.pendientes ?? 0, color: 'text-yellow-400' },
    { label: 'Activos', value: stats.activas ?? 0, color: 'text-green-400' },
    { label: 'Suspendidos', value: stats.suspendidas ?? 0, color: 'text-red-400' },
  ]
}

export function tabsAprobacion({ pendientes, productos, ofertas }: {
  pendientes?: number
  productos: number
  ofertas: number
}): { id: TabAprobacion; label: string; count: number }[] {
  return [
    { id: 'empresas', label: 'Empresas', count: pendientes ?? 0 },
    { id: 'productos', label: 'Productos', count: productos },
    { id: 'ofertas', label: 'Promociones', count: ofertas },
  ]
}

export function fechaSolicitud(date?: string | number | Date | null): string {
  if (!date) return '—'
  return formatDateTime(date)
}
