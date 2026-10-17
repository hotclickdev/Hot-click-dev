import api from '@/services/api'

/**
 * S4-24 / S4-11 / S4-12 · Próxima mensualidad y estado del plan — CONTRATO SUPUESTO.
 *   GET  /api/negocio/mensualidad → { plan, estado: 'ACTIVO'|'PENDIENTE_PAGO'|'EN_GRACIA', monto, fecha: string|null,
 *                                    porcentaje: number|null, minimoComision: number|null }
 *   POST /api/negocio/mensualidad/pago → { url }  (Checkout de ONVO)
 * El monto (₡12.900 Pyme / ₡28.900 Negocio Plus) viene del backend; `fecha` null = «fecha a definir por HOT_CLICK».
 */
export type EstadoPlan = 'ACTIVO' | 'PENDIENTE_PAGO' | 'EN_GRACIA'
export type Mensualidad = { plan: string; estado: EstadoPlan; monto: number | null; fecha: string | null; porcentaje: number | null; minimoComision: number | null }

export function normalizarMensualidad(data: unknown): Mensualidad {
  const d = ((data && typeof data === 'object' && 'data' in data ? (data as { data: unknown }).data : data) ?? {}) as Record<string, unknown>
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  const estado = (['ACTIVO', 'PENDIENTE_PAGO', 'EN_GRACIA'] as const).find((e) => e === d.estado) ?? 'ACTIVO'
  return { plan: typeof d.plan === 'string' ? d.plan : '', estado, monto: num(d.monto), fecha: typeof d.fecha === 'string' && d.fecha ? d.fecha : null, porcentaje: num(d.porcentaje), minimoComision: num(d.minimoComision) }
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
  if (m.estado === 'PENDIENTE_PAGO') return `Tu plan ${m.plan} se activa apenas se confirme el pago. Mientras tanto tu tienda funciona con las funciones de Emprendedor.`
  return 'No pudimos cobrar tu mensualidad. Si no se completa el pago antes de que termine el período de gracia, tu tienda se pausa: las compras hechas siguen válidas, pero desde el día siguiente tus productos salen como AGOTADO u ocultos y se ocultan tus redes y el botón de compartir.'
}
