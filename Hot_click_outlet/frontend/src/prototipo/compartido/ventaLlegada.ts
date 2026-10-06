/** Cómo entra una venta. Derivado del control segmentado y las tarjetas del manual de marca. */

export type CaminoVenta = {
  titulo: string
  detalle: string
}

export const CAMINOS_PEDIDO: CaminoVenta[] = [
  { titulo: 'Tienda', detalle: 'El cliente paga en el checkout. El pedido nace con origen Tienda.' },
  { titulo: 'Tienda del vendedor', detalle: 'Compra como invitado en la página pública del negocio.' },
  { titulo: 'Caja', detalle: 'La venta se cobra en el POS o con el QR de la caja.' },
  { titulo: 'Código QR', detalle: 'El cliente se cobra solo con el QR del local.' },
  { titulo: 'Telegram', detalle: 'El bot cierra la venta y crea el pedido.' },
  { titulo: 'A mano', detalle: 'Alguien carga el pedido o lo asigna desde la plataforma.' },
]

export const CAMINOS_ENCARGO: CaminoVenta[] = [
  {
    titulo: 'Ficha del producto',
    detalle: 'El cliente manda fotos y notas en un producto personalizado. Queda por cotizar.',
  },
  {
    titulo: 'Carrito',
    detalle: 'Si compra un personalizado en el checkout, el encargo nace ligado a ese pedido.',
  },
  {
    titulo: 'Link de pago',
    detalle: 'Cuando paga la cotización, el encargo pasa a pagado y el pedido aparece en Pedidos.',
  },
]

const ETIQUETAS_ORIGEN: Record<string, string> = {
  ONLINE: 'Tienda',
  TIENDA_WEB: 'Tienda del vendedor',
  POS: 'Caja',
  QR: 'Código QR',
  TELEGRAM: 'Telegram',
  ASIGNACION_MANUAL: 'A mano',
  MANUAL: 'A mano',
}

const ETIQUETAS_ENCARGO: Record<string, string> = {
  TODOS: 'Todos',
  PENDIENTE: 'Por cotizar',
  APROBADO: 'Cotizado',
  PENDIENTE_PAGO: 'Esperando pago',
  PAGADO: 'Pagado',
  RECHAZADO: 'Rechazado',
  VENCIDO: 'Vencido',
}

/** El pedido sin origen usa el default de la base: ONLINE (checkout). */
export function etiquetaOrigenPedido(origen: string | null | undefined): string {
  const clave = (origen ?? '').trim().toUpperCase()
  if (!clave || clave === 'ONLINE') return 'Tienda'
  return ETIQUETAS_ORIGEN[clave] ?? 'Otro canal'
}

export function etiquetaEstadoEncargo(estado: string): string {
  return ETIQUETAS_ENCARGO[estado] ?? estado
}

/** Sin pedido ligado, el encargo entró por la ficha. Con pedido, ya está en una compra. */
export function llegadaEncargo(pedidoId: number | null | undefined): string {
  return pedidoId ? 'Ligada a un pedido' : 'Ficha del producto'
}

export function estiloEstadoEncargo(estado: string): { background: string; color: string } {
  if (estado === 'PAGADO') return { background: 'var(--hc-success-bg)', color: 'var(--hc-success)' }
  if (estado === 'RECHAZADO' || estado === 'VENCIDO') {
    return { background: 'var(--hc-danger-bg)', color: 'var(--hc-danger)' }
  }
  if (estado === 'PENDIENTE_PAGO' || estado === 'APROBADO') {
    return { background: 'var(--hc-info-bg)', color: 'var(--hc-info)' }
  }
  return { background: 'var(--hc-warning-bg)', color: 'var(--hc-warning)' }
}
