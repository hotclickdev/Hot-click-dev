import type { EstadoPedido, PedidoMock } from './mock'

/** QA-NEG-061/027: el título usa el código del pedido; el id de la base es global y no es de la tienda. */
export function tituloPedido(p: { id: string; numeroPedido?: string }): string {
  return p.numeroPedido ? `Pedido ${p.numeroPedido}` : `Pedido #${p.id}`
}

/** «16/10/2026 17:05» en hora de Costa Rica; vacío si la fecha no se puede leer. */
export function fechaHoraPedido(fecha: string | undefined): string {
  if (!fecha) return ''
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('es-CR', {
    timeZone: 'America/Costa_Rica', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d).replace(',', '')
}

export const FILTROS_PEDIDOS = ['Todos', 'Pendientes', 'Enviados', 'Entregados'] as const

export type FiltroPedidos = (typeof FILTROS_PEDIDOS)[number]

export function filtrarPedidos(pedidos: PedidoMock[], filtro: string): PedidoMock[] {
  if (filtro === 'Todos') return pedidos
  // Pendientes = sin despachar: con pago confirmado ('Pendiente') o esperando el pago.
  if (filtro === 'Pendientes') return pedidos.filter((p) => p.estado === 'Pendiente' || p.estado === 'Esperando pago')
  if (filtro === 'Enviados') return pedidos.filter((p) => p.estado === 'Enviado')
  return pedidos.filter((p) => p.estado === 'Entregado')
}

export function estiloEstadoPedido(estado: EstadoPedido): { background: string; color: string } {
  if (estado === 'Entregado') return { background: 'var(--hc-success-bg)', color: 'var(--hc-success)' }
  if (estado === 'Enviado') return { background: 'var(--hc-info-bg)', color: 'var(--hc-info)' }
  if (estado === 'Cancelado') return { background: 'var(--hc-danger-bg)', color: 'var(--hc-danger)' }
  return { background: 'var(--hc-warning-bg)', color: 'var(--hc-warning)' }
}
