import api from '@/services/api'
import { codigoError, estadoError, mensajeErrorContrato } from '@/utils/erroresContrato'

/**
 * S4-24 / S4-11 / S4-12 · Próxima mensualidad y estado del plan. Contrato real de #208 (`docs/contratos/S4-24-mensualidad.md`),
 * solo propietario (personal → 403 `SOLO_PROPIETARIO`). Sin Tilopay: no usa /api/billing/*.
 *   GET  /api/negocio/mensualidad → { plan, estado: 'ACTIVO'|'PENDIENTE_PAGO'|'EN_GRACIA', monto, fecha: string|null,
 *                                    porcentaje: number|null, minimoComision: number|null }
 *   POST /api/negocio/mensualidad/pago → { url }  (Checkout de ONVO)
 * `plan`, `monto`, `porcentaje` y `minimoComision` llegan del plan en la base (null sin plan): se muestran tal cual, nunca se escriben
 * en el front. `fecha` null = «fecha a definir por HOT_CLICK». `EN_GRACIA` todavía no se devuelve (días de gracia: decisión del dueño).
 * El POST de pago es un esqueleto fail-closed: hoy responde 503 `ONVO_NO_CONFIGURADO` → «Todavía no disponible».
 */
export type EstadoPlan = 'ACTIVO' | 'PENDIENTE_PAGO' | 'EN_GRACIA'
export type Mensualidad = { plan: string | null; estado: EstadoPlan; monto: number | null; fecha: string | null; porcentaje: number | null; minimoComision: number | null }

export function normalizarMensualidad(data: unknown): Mensualidad {
  const d = ((data && typeof data === 'object' && 'data' in data ? (data as { data: unknown }).data : data) ?? {}) as Record<string, unknown>
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  const estado = (['ACTIVO', 'PENDIENTE_PAGO', 'EN_GRACIA'] as const).find((e) => e === d.estado) ?? 'ACTIVO'
  return { plan: typeof d.plan === 'string' && d.plan.trim() ? d.plan : null, estado, monto: num(d.monto), fecha: typeof d.fecha === 'string' && d.fecha ? d.fecha : null, porcentaje: num(d.porcentaje), minimoComision: num(d.minimoComision) }
}

export const mensualidadApi = {
  obtener: () => api.get('/negocio/mensualidad').then((r) => normalizarMensualidad(r.data)),
  pagar: () => api.post('/negocio/mensualidad/pago').then((r) => {
    const d = (r.data && typeof r.data === 'object' && 'data' in r.data ? r.data.data : r.data) as { url?: unknown } | null
    return typeof d?.url === 'string' ? d.url : null
  }),
}

export const FECHA_POR_DEFINIR = 'fecha a definir por HOT_CLICK'

export const VISTA_ESTADO: Record<EstadoPlan, { chip: string; clase: string; etiquetaMonto: string; etiquetaFecha: string; caja: 'info' | 'aviso' | 'mal'; conPago: boolean }> = {
  ACTIVO: { chip: 'Activo', clase: 'bg-hc-success-bg text-hc-success-text', etiquetaMonto: 'Próxima mensualidad', etiquetaFecha: 'Fecha', caja: 'info', conPago: false },
  PENDIENTE_PAGO: { chip: 'Pendiente de pago', clase: 'bg-hc-warning-bg text-hc-warning', etiquetaMonto: 'Mensualidad por pagar', etiquetaFecha: 'Vence', caja: 'aviso', conPago: true },
  EN_GRACIA: { chip: 'En gracia', clase: 'bg-hc-danger-bg text-hc-danger', etiquetaMonto: 'Mensualidad por pagar', etiquetaFecha: 'Vence', caja: 'mal', conPago: true },
}

export function textoAviso(m: Mensualidad): string {
  if (m.estado === 'ACTIVO') return `Tu próxima mensualidad se cobra el ${m.fecha ?? FECHA_POR_DEFINIR}.`
  if (m.estado === 'PENDIENTE_PAGO') return `Tu plan${m.plan ? ` ${m.plan}` : ''} se activa apenas se confirme el pago. Mientras tanto tu tienda funciona con las funciones de Emprendedor.`
  return 'No pudimos cobrar tu mensualidad. Si no se completa el pago antes de que termine el período de gracia, tu tienda se pausa: las compras hechas siguen válidas, pero desde el día siguiente tus productos salen como AGOTADO u ocultos y se ocultan tus redes y el botón de compartir.'
}

export const TEXTO_PAGO_NO_DISPONIBLE = 'Todavía no disponible: el pago de la mensualidad con ONVO todavía no está habilitado. Te avisamos cuando puedas pagar desde acá.'
export const TEXTO_SOLO_PROPIETARIO_PLAN = 'Solo la persona dueña del negocio puede ver y pagar el plan.'

/** Errores de #208. 503 `ONVO_NO_CONFIGURADO` (hoy, siempre) y 501 → «Todavía no disponible». */
export function mensajeErrorMensualidad(err: unknown, respaldo: string): string {
  const code = codigoError(err)
  if (code === 'ONVO_NO_CONFIGURADO' || estadoError(err) === 503 || estadoError(err) === 501) return TEXTO_PAGO_NO_DISPONIBLE
  if (code === 'PLAN_SIN_PRECIO') return 'Tu plan no tiene un precio para cobrar. Escribinos a soporte para revisarlo.'
  if (code === 'SOLO_PROPIETARIO' || estadoError(err) === 403) return TEXTO_SOLO_PROPIETARIO_PLAN
  return mensajeErrorContrato(err) ?? respaldo
}
