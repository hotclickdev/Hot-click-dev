export type PlanQueryId = 'emprendedor' | 'pyme' | 'negocio-plus'

const VALIDOS: PlanQueryId[] = ['emprendedor', 'pyme', 'negocio-plus']

export function leerPlanQuery(search: string): PlanQueryId | null {
  const valor = new URLSearchParams(search).get('plan')
  return VALIDOS.includes(valor as PlanQueryId) ? (valor as PlanQueryId) : null
}

export function planIdToNombreBackend(id: PlanQueryId): 'EMPRENDEDOR' | 'PYME' | 'NEGOCIO_PLUS' {
  if (id === 'pyme') return 'PYME'
  if (id === 'negocio-plus') return 'NEGOCIO_PLUS'
  return 'EMPRENDEDOR'
}

export function esPlanPago(id: PlanQueryId | null): boolean {
  return id === 'pyme' || id === 'negocio-plus'
}
