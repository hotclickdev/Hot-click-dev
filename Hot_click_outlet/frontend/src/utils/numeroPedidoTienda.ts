/**
 * S4-20: número de pedido propio de cada tienda (contrato `docs/contratos/S4-20-numero-pedido-tienda.md`).
 * `numeroTienda` lo asigna el backend; en pedidos anteriores a V182 llega `null` y se muestra `numeroPedido`.
 * El `id` interno nunca se muestra.
 */
export type PedidoConNumero = {
  numeroTienda?: number | null
  numeroPedido?: string | null
}

function numeroTiendaValido(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isInteger(valor) && valor > 0
}

/** «#37» si hay número de la tienda; si no, el `numeroPedido` viejo; si no hay ninguno, vacío. */
export function numeroVisiblePedido(pedido: PedidoConNumero | null | undefined): string {
  if (!pedido) return ''
  if (numeroTiendaValido(pedido.numeroTienda)) return `#${pedido.numeroTienda}`
  const viejo = typeof pedido.numeroPedido === 'string' ? pedido.numeroPedido.trim() : ''
  return viejo
}

/** «Pedido #37», «Pedido ORD-…» o «Pedido» a secas. */
export function etiquetaPedido(pedido: PedidoConNumero | null | undefined): string {
  const numero = numeroVisiblePedido(pedido)
  return numero ? `Pedido ${numero}` : 'Pedido'
}
