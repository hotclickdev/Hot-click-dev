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
  trialDias?: number
  primerCobro?: string
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
      ...trialDeRespuesta(d),
    },
  }
}

/** `trialDias` > 0 (y `primerCobro` válido) de una respuesta de cobro; vacío si no hay período gratis. */
function trialDeRespuesta(d: Record<string, unknown>): { trialDias?: number; primerCobro?: string } {
  const n = Number(d.trialDias)
  if (!Number.isInteger(n) || n <= 0) return {}
  const fecha = typeof d.primerCobro === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.primerCobro) ? d.primerCobro : undefined
  return fecha ? { trialDias: n, primerCobro: fecha } : { trialDias: n }
}

/**
 * Texto del checkout con período gratis: la tarjeta se registra ahora y el primer cobro llega después. Con fecha
 * reusa «Tu primer cobro es el …». null si no hay días gratis (checkout normal, sin promesa de gratuidad).
 */
export function textoCheckoutTrial(trialDias?: number | null, primerCobro?: string | null): string | null {
  if (typeof trialDias !== 'number' || !Number.isInteger(trialDias) || trialDias <= 0) return null
  const base = 'Registramos tu tarjeta ahora, pero no te cobramos todavía.'
  return primerCobro && /^\d{4}-\d{2}-\d{2}$/.test(primerCobro)
    ? `${base} Tu primer cobro es el ${fechaVisible(primerCobro)}, al terminar el período gratis.`
    : `${base} El primer cobro se hace al terminar el período gratis.`
}

/** Aviso a mostrar: falta el pago, o trial con método de pago guardado (ONVO cobra al terminar el trial). */
export type AvisoPlanPendiente =
  | { tipo: 'falta_pago'; plan: string }
  | { tipo: 'trial_con_metodo'; plan: string; primerCobro: string }

/** `GET /billing/plan-pendiente` → aviso. `estado=TRIAL_CON_METODO` con fecha válida → no falta el pago. */
export function avisoPlanPendiente(data: unknown): AvisoPlanPendiente | null {
  const plan = planPorCompletar(data)
  if (!plan) return null
  const d = data as Record<string, unknown>
  const fecha = typeof d.primerCobro === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.primerCobro) ? d.primerCobro : null
  if (d.estado === 'TRIAL_CON_METODO' && fecha) return { tipo: 'trial_con_metodo', plan, primerCobro: fecha }
  return { tipo: 'falta_pago', plan }
}

/** «2027-02-01» → «1 de febrero de 2027» (sin zona: es una fecha de calendario de Costa Rica). */
export function fechaVisible(iso: string): string {
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre',
    'noviembre', 'diciembre']
  const [a, m, d] = iso.split('-').map(Number)
  return `${d} de ${meses[(m ?? 1) - 1]} de ${a}`
}

export const MSG_PAGO_EN_PROCESO =
  'Tu pago está en proceso. Apenas ONVO lo confirme se activa el plan; no tenés que hacer nada más.'

/**
 * MEDIO-3: al volver del SDK de ONVO se pide `POST /billing/reconciliar-pago`. Con `activado` se refresca el aviso
 * (desaparece sin recargar). Cualquier otra respuesta o un error (incluido el 429 del tope por empresa) →
 * «pago en proceso», sin mostrar error.
 */
export async function alVolverDelPago(
  reconciliar: () => Promise<{ data: unknown }>,
  refrescar: () => Promise<void>,
): Promise<'confirmado' | 'en_proceso'> {
  try {
    const { data } = await reconciliar()
    const status = data && typeof data === 'object' ? (data as Record<string, unknown>).status : undefined
    if (status === 'sin_pago_pendiente') {
      // Nada pendiente en el backend: se refresca el aviso; si sigue, «en proceso».
      await refrescar().catch(() => undefined)
      return 'en_proceso'
    }
    if (status !== 'activado') return 'en_proceso'
  } catch {
    return 'en_proceso'
  }
  await refrescar().catch(() => undefined)
  return 'confirmado'
}
