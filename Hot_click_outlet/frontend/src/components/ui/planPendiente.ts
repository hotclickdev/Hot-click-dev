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

/** Cobro ONVO a abrir desde el aviso (misma forma que PagoPlanPendiente de useCambiarPlan). */
export type PagoDesdeAviso = {
  proveedor: 'ONVO'
  subscriptionId: string
  customerId?: string
  publishableKey?: string
  planNombre?: string
}

/**
 * ALTO-02b: respuesta de `POST /billing/completar-pago`. Con `requiere_pago` y subscriptionId se abre el SDK de ONVO
 * sobre esa suscripción (cobra la primera factura o guarda el método de pago); nunca se vuelve a /cambiar-plan.
 * Cualquier otra cosa lleva a la pantalla de planes.
 */
export function accionCompletarPago(data: unknown): { tipo: 'pagar'; pago: PagoDesdeAviso } | { tipo: 'ir_a_planes' } {
  if (!data || typeof data !== 'object') return { tipo: 'ir_a_planes' }
  const d = data as Record<string, unknown>
  const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v : undefined)
  const subscriptionId = texto(d.subscriptionId)
  if (d.status !== 'requiere_pago' || !subscriptionId) return { tipo: 'ir_a_planes' }
  return {
    tipo: 'pagar',
    pago: {
      proveedor: 'ONVO',
      subscriptionId,
      customerId: texto(d.customerId),
      publishableKey: texto(d.publishableKey),
      planNombre: texto(d.planNombre),
    },
  }
}
