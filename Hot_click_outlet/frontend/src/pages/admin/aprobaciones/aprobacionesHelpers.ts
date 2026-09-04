import { formatDateTime } from '@/utils/format'
import type { Id } from '@/types/api'
import type { Producto } from '@/types/producto'
import type { EmpresaLista } from '../empresas/empresasHelpers'

export const ESTADO_PENDIENTE = 'PENDIENTE_APROBACION'
export const ESTADO_ACTIVO = 'ACTIVO'
export const ESTADO_SUSPENDIDO = 'SUSPENDIDO'

export type TabAprobacion = 'empresas' | 'productos' | 'ofertas' | 'cobro'
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

export type ProductoPendiente = Pick<Producto, 'imagenUrl' | 'precioVenta' | 'sku' | 'empresaNombre' | 'categoriaNombre'> & {
  id: Id
  nombreProducto?: string
  usuarioPide?: string
  nombreCategoria?: string
}

export type OfertaPendiente = Pick<Producto, 'imagenUrl' | 'precioVenta' | 'empresaNombre'> & {
  id: Id
  nombreProducto?: string
  porcentajeDescuento?: number | null
  usuarioPide?: string
}

export type CuentaCobroPendiente = {
  id: Id
  empresaNombre?: string
  usuarioPide?: string
  tipo?: string
  mascaraActual?: string
  mascaraNueva?: string
  fechaSolicitud?: string
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
  productos: 'No hay revisión producto por producto. Pausado se gestiona en Empresas; el catálogo se abre al aprobar el negocio.',
  ofertas: 'Promociones esperando tu aprobación para aplicarse',
  cobro: 'Cambios de cuenta de cobro (SINPE/IBAN) esperando tu aprobación',
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

export function kpisAprobacion(stats: StatsAprobacion): { labelKey: string; value: number; color: string }[] {
  return [
    { labelKey: 'adminAprobaciones.kpiPending', value: stats.pendientes ?? 0, color: 'text-yellow-400' },
    { labelKey: 'adminAprobaciones.kpiActive', value: stats.activas ?? 0, color: 'text-green-400' },
    { labelKey: 'adminAprobaciones.kpiSuspended', value: stats.suspendidas ?? 0, color: 'text-red-400' },
  ]
}

export function tabsAprobacion({ pendientes, productos, ofertas, cobro }: {
  pendientes?: number
  productos: number
  ofertas: number
  cobro: number
}): { id: TabAprobacion; count: number }[] {
  const tabs: { id: TabAprobacion; count: number }[] = [
    { id: 'empresas', count: pendientes ?? 0 },
    { id: 'ofertas', count: ofertas },
    { id: 'cobro', count: cobro },
  ]
  if (productos > 0) {
    tabs.splice(1, 0, { id: 'productos', count: productos })
  }
  return tabs
}

export function fechaSolicitud(date?: string | number | Date | null): string {
  if (!date) return '—'
  return formatDateTime(date)
}

export function metaProductoPendiente(producto: ProductoPendiente): string {
  const categoria = producto.categoriaNombre ?? producto.nombreCategoria
  return [producto.empresaNombre, categoria].filter(Boolean).join(' · ')
}

export function subtituloModeracion(
  tab: TabAprobacion,
  productos: number,
  empresas: number,
  ofertas: number,
  cobro = 0,
): string {
  if (tab === 'productos') {
    return productos > 0
      ? `${productos} solicitudes legacy de producto`
      : 'Sin cola de productos: el gate es el negocio'
  }
  if (tab === 'ofertas') return `${ofertas} promociones esperando revisión`
  if (tab === 'cobro') return `${cobro} cuentas de cobro esperando revisión`
  return `${empresas} tiendas esperando revisión`
}
