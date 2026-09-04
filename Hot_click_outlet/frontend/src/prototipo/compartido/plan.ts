import { RUTA_EMPRENDEDOR, RUTA_NEGOCIO_PLUS, RUTA_PYME } from '@/utils/planPaths'

export type PlanId = 'emprendedor' | 'pyme' | 'negocioPlus'

export type ExtraOpcion = {
  label: string
  to: string
}

export type PlanConfig = {
  id: PlanId
  badge: string
  planLabel: string
  basePath: string
  extraOpcion: ExtraOpcion
  pedidosSubtitulo: string
  usuario: string
}

export const PLAN_EMPRENDEDOR: PlanConfig = {
  id: 'emprendedor',
  badge: 'EMPRENDEDOR',
  planLabel: 'Plan Emprendedor',
  basePath: RUTA_EMPRENDEDOR,
  extraOpcion: { label: 'Opciones', to: 'opciones' },
  pedidosSubtitulo: 'Tus ventas y su estado de envío',
  usuario: 'Emprendedor',
}

export const PLAN_PYME: PlanConfig = {
  id: 'pyme',
  badge: 'PLAN PYME',
  planLabel: 'Plan PYME',
  basePath: RUTA_PYME,
  extraOpcion: { label: 'Mi equipo', to: 'equipo' },
  pedidosSubtitulo: 'Tus ventas y su estado de envío',
  usuario: 'qa2.emprendedor',
}

export const PLAN_NEGOCIO_PLUS: PlanConfig = {
  id: 'negocioPlus',
  badge: 'NEGOCIO PLUS',
  planLabel: 'Negocio Plus',
  basePath: RUTA_NEGOCIO_PLUS,
  extraOpcion: { label: 'Mis sucursales', to: 'sucursales' },
  pedidosSubtitulo: 'Ventas de todas tus sucursales',
  usuario: 'qa.negocioplus.demo',
}

export function rutaSeller(basePath: string, segmento = ''): string {
  if (!segmento) return basePath
  return `${basePath}/${segmento.replace(/^\//, '')}`
}
