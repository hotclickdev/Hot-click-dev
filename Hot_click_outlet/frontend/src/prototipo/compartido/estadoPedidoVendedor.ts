/**
 * Estado visible de un pedido para el vendedor (paneles Emprendedor, PYME y Negocio Plus).
 * Misma regla que el backend (`PedidoDespachoPolicy`): solo se despacha con el pago confirmado.
 */
export type EstadoPedidoVendedor = 'Esperando pago' | 'Pendiente' | 'Enviado' | 'Entregado' | 'Cancelado'

/**
 * Sin pago confirmado: tarjeta sin capturar o pedido de tienda/manual sin confirmar (PENDIENTE),
 * SINPE sin comprobante y efectivo del checkout (PENDIENTE_COMPROBANTE), comprobante en revisión
 * (PENDIENTE_APROBACION). Vacío cuenta como PENDIENTE (valor por defecto del backend).
 */
export const ESTADOS_SIN_PAGO_CONFIRMADO: ReadonlySet<string> = new Set([
  'PENDIENTE',
  'PENDIENTE_COMPROBANTE',
  'PENDIENTE_APROBACION',
])

/** Estados que no cuentan como venta en los reportes (los mismos que antes caían en 'Pendiente'). */
export const ESTADOS_SIN_VENTA: ReadonlySet<EstadoPedidoVendedor> = new Set<EstadoPedidoVendedor>([
  'Esperando pago',
  'Pendiente',
  'Cancelado',
])

export function estadoPedidoVendedor(estado?: string | null): EstadoPedidoVendedor {
  const e = (estado ?? '').trim().toUpperCase()
  if (e === 'ENTREGADO' || e === 'COMPLETADO') return 'Entregado'
  if (e === 'ENVIADO') return 'Enviado'
  if (e === 'CANCELADO') return 'Cancelado'
  if (!e || ESTADOS_SIN_PAGO_CONFIRMADO.has(e)) return 'Esperando pago'
  // PAGADO, EN_PREPARACION, LISTO_RETIRO…: pago confirmado, falta despachar.
  return 'Pendiente'
}

/** 'Pendiente' = pago confirmado y todavía sin despachar: lo único que muestra "Marcar como despachado". */
export function puedeDespachar(estado: EstadoPedidoVendedor): boolean {
  return estado === 'Pendiente'
}

/**
 * Mensaje al fallar el despacho. El 409 trae el motivo del backend (pago sin confirmar o pedido
 * cancelado, `PedidoDespachoPolicy`); cualquier otro error usa el texto genérico.
 */
export function mensajeErrorDespacho(err: unknown, generico: string): string {
  if (!err || typeof err !== 'object') return generico
  const res = (err as { response?: { status?: number; data?: { message?: unknown } } }).response
  const mensaje = res?.data?.message
  if (res?.status === 409 && typeof mensaje === 'string' && mensaje.trim()) return mensaje.trim()
  return generico
}
