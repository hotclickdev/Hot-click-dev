import { formatDateTime } from '@/utils/format'

export const ESTADO_PENDIENTE = 'PENDIENTE_APROBACION'
export const ESTADO_ACTIVO = 'ACTIVO'
export const ESTADO_SUSPENDIDO = 'SUSPENDIDO'

export const ESTADO_COLOR = {
  PENDIENTE_APROBACION: 'bg-yellow-500/15 text-yellow-400',
  ACTIVO: 'bg-green-500/15 text-green-400',
  RECHAZADO: 'bg-red-500/15 text-red-400',
  SUSPENDIDO: 'bg-amber-500/15 text-amber-400',
}

export const SUBTITULO_TAB = {
  empresas: 'Negocios nuevos esperando tu aprobación para activarse en la plataforma',
  productos: 'El catálogo se abre al aprobar el negocio. Los productos nuevos de un negocio activo no esperan revisión acá.',
  ofertas: 'Promociones esperando tu aprobación para aplicarse',
}

/**
 * @param {unknown} data
 * @returns {object[]}
 */
export function listaDesdeRespuesta(data) {
  return Array.isArray(data) ? data : []
}

/**
 * @param {object[]} solicitudes
 * @returns {object[]}
 */
export function solicitudesPendientes(solicitudes) {
  return solicitudes.filter((empresa) => empresa.estadoEmpresa === ESTADO_PENDIENTE)
}

/**
 * @param {object[]} empresas
 * @returns {{ pendientes: number, activas: number, suspendidas: number }}
 */
export function statsDesdeEmpresas(empresas) {
  return {
    pendientes: empresas.filter((empresa) => empresa.estadoEmpresa === ESTADO_PENDIENTE).length,
    activas: empresas.filter((empresa) => empresa.estadoEmpresa === ESTADO_ACTIVO).length,
    suspendidas: empresas.filter((empresa) => empresa.estadoEmpresa === ESTADO_SUSPENDIDO).length,
  }
}

/**
 * @param {{ pendientes?: number, activas?: number, suspendidas?: number }} stats
 * @returns {{ label: string, value: number, color: string }[]}
 */
export function kpisAprobacion(stats) {
  return [
    { label: 'Por aprobar', value: stats.pendientes ?? 0, color: 'text-yellow-400' },
    { label: 'Activos', value: stats.activas ?? 0, color: 'text-green-400' },
    { label: 'Suspendidos', value: stats.suspendidas ?? 0, color: 'text-red-400' },
  ]
}

/**
 * @param {{ pendientes?: number, productos: number, ofertas: number }} counts
 * @returns {{ id: string, label: string, count: number }[]}
 */
export function tabsAprobacion({ pendientes, productos, ofertas }) {
  return [
    { id: 'empresas', label: 'Empresas', count: pendientes ?? 0 },
    { id: 'productos', label: 'Productos', count: productos },
    { id: 'ofertas', label: 'Promociones', count: ofertas },
  ]
}

/**
 * @param {string|number|Date} [date]
 * @returns {string}
 */
export function fechaSolicitud(date) {
  if (!date) return '—'
  return formatDateTime(date)
}
