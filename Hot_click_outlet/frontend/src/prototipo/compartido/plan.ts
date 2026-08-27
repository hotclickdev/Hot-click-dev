export type PlanId = 'pyme' | 'negocioPlus'

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

export const PLAN_PYME: PlanConfig = {
  id: 'pyme',
  badge: 'PLAN PYME',
  planLabel: 'Plan PYME',
  basePath: '/prototipo/pyme',
  extraOpcion: { label: 'Mi equipo', to: 'equipo' },
  pedidosSubtitulo: 'Tus ventas y su estado de envío',
  usuario: 'qa2.emprendedor',
}

export const PLAN_NEGOCIO_PLUS: PlanConfig = {
  id: 'negocioPlus',
  badge: 'NEGOCIO PLUS',
  planLabel: 'Negocio Plus',
  basePath: '/prototipo/negocio-plus',
  extraOpcion: { label: 'Mis sucursales', to: 'sucursales' },
  pedidosSubtitulo: 'Ventas de todas tus sucursales',
  usuario: 'qa2.emprendedor',
}

export function rutaSeller(basePath: string, segmento = ''): string {
  if (!segmento) return basePath
  return `${basePath}/${segmento.replace(/^\//, '')}`
}
