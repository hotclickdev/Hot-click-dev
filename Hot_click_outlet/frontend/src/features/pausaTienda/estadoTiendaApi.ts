import api from '@/services/api'

/**
 * Panel del vendedor · CONTRATO SUPUESTO (feat/pausa-cobros-tienda):
 *   GET  /api/negocio/estado-tienda → { estado: 'ACTIVA'|'PAUSADA', reactivada?: boolean, plan: string,
 *                                        montoMensualidad: number|null, diasGracia: number|null, pedidosEnCurso: number }
 *   POST /api/negocio/mensualidad/pago → { url }  (Checkout de ONVO para pagar la mensualidad)
 * El monto sale del plan en el backend; `diasGracia` null = «días de gracia a definir por HOT_CLICK».
 */
export type EstadoTienda = {
  estado: 'ACTIVA' | 'PAUSADA'
  reactivada: boolean
  plan: string | null
  montoMensualidad: number | null
  diasGracia: number | null
  pedidosEnCurso: number
}

export function normalizarEstadoTienda(data: unknown): EstadoTienda {
  const d = ((data && typeof data === 'object' && 'data' in data ? (data as { data: unknown }).data : data) ?? {}) as Record<string, unknown>
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null)
  return {
    estado: d.estado === 'PAUSADA' ? 'PAUSADA' : 'ACTIVA',
    reactivada: d.reactivada === true,
    plan: typeof d.plan === 'string' ? d.plan : null,
    montoMensualidad: num(d.montoMensualidad),
    diasGracia: num(d.diasGracia),
    pedidosEnCurso: num(d.pedidosEnCurso) ?? 0,
  }
}

export const estadoTiendaApi = {
  obtener: () => api.get('/negocio/estado-tienda').then((r) => normalizarEstadoTienda(r.data)),
  pagarMensualidad: () => api.post('/negocio/mensualidad/pago').then((r) => {
    const d = (r.data && typeof r.data === 'object' && 'data' in r.data ? r.data.data : r.data) as { url?: unknown } | null
    return typeof d?.url === 'string' ? d.url : null
  }),
}

export const DIAS_GRACIA_POR_DEFINIR = 'días de gracia a definir por HOT_CLICK'

export function textoDiasGracia(dias: number | null): string {
  if (dias == null) return DIAS_GRACIA_POR_DEFINIR
  return dias === 1 ? '1 día de gracia' : `${dias} días de gracia`
}

export function textoPedidosEnCurso(n: number): string {
  if (n === 0) return 'No tenés pedidos pendientes de antes de la pausa.'
  return n === 1
    ? '1 pedido pagado antes de la pausa. Tenés que entregarlo igual.'
    : `${n} pedidos pagados antes de la pausa. Tenés que entregarlos igual.`
}
