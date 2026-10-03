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

/** Método de pago y de entrega del pedido, tal como vienen del backend. */
export type DatosEntregaPedido = { metodoPago?: string | null; metodoEnvio?: string | null }

const normalizar = (valor?: string | null) => (valor ?? '').trim().toUpperCase()

/**
 * Efectivo con retiro en tienda que todavía no se cobró (PENDIENTE_COMPROBANTE): el cliente paga al
 * retirar. No es "Esperando pago": el vendedor lo entrega y el backend registra el cobro en ese paso.
 * Efectivo con envío a domicilio sigue esperando el pago.
 */
export function pagaAlRetirar(estado?: string | null, datos?: DatosEntregaPedido): boolean {
  return normalizar(estado) === 'PENDIENTE_COMPROBANTE'
    && normalizar(datos?.metodoPago) === 'EFECTIVO'
    && normalizar(datos?.metodoEnvio) === 'RETIRO_EN_TIENDA'
}

export function estadoPedidoVendedor(estado?: string | null, datos?: DatosEntregaPedido): EstadoPedidoVendedor {
  const e = normalizar(estado)
  if (e === 'ENTREGADO' || e === 'COMPLETADO') return 'Entregado'
  if (e === 'ENVIADO') return 'Enviado'
  if (e === 'CANCELADO') return 'Cancelado'
  if (pagaAlRetirar(e, datos)) return 'Pendiente'
  if (!e || ESTADOS_SIN_PAGO_CONFIRMADO.has(e)) return 'Esperando pago'
  // PAGADO, EN_PREPARACION, LISTO_RETIRO…: pago confirmado, falta despachar.
  return 'Pendiente'
}

/**
 * 'Pendiente' = pago confirmado (o efectivo que se paga al retirar) y todavía sin despachar ni entregar.
 * Si el pedido se paga al retirar, la acción es "Marcar entregado" en vez de despachar.
 */
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
