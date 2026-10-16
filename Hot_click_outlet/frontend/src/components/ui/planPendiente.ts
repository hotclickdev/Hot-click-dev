/** Respuesta de `GET /billing/plan-pendiente` (204 → sin aviso). */
export type PlanPendiente = { plan?: string | null; motivo?: string | null }

/** Nombre del plan a pagar, o null si no hay que mostrar el aviso. */
export function planPorCompletar(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const plan = (data as PlanPendiente).plan
  return typeof plan === 'string' && plan.trim() ? plan.trim() : null
}

/** «PYME» / «NEGOCIO_PLUS» → «Pyme» / «Negocio Plus». */
export function nombrePlanVisible(plan: string): string {
  return plan
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((p) => p[0]!.toUpperCase() + p.slice(1))
    .join(' ')
}

/** Clave i18n del aviso «se activa apenas se confirme el pago» (texto de Producto, 16-oct-2026). */
export function clavePlanPendiente(plan: string): string {
  return plan.toUpperCase().replace(/\s+/g, '_') === 'NEGOCIO_PLUS' ? 'planPendiente.negocioPlus' : 'planPendiente.pyme'
}
