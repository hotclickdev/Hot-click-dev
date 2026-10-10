import type { EstadoPedido, PedidoMock } from './mock'

export const FILTROS_PEDIDOS = ['Todos', 'Pendientes', 'Enviados', 'Entregados'] as const

export type FiltroPedidos = (typeof FILTROS_PEDIDOS)[number]

/** Parámetro de URL para abrir Pedidos ya filtrado, por ejemplo desde «Despachar» en Inicio. */
export const PARAM_FILTRO_PEDIDOS = 'filtro'

/** Lee `?filtro=pendientes|enviados|entregados|todos` (sin distinguir mayúsculas); cualquier otro valor es «Todos». */
export function filtroPedidosDesdeBusqueda(busqueda: string): FiltroPedidos {
  const valor = new URLSearchParams(busqueda).get(PARAM_FILTRO_PEDIDOS)?.trim().toLowerCase()
  return FILTROS_PEDIDOS.find((filtro) => filtro.toLowerCase() === valor) ?? 'Todos'
}

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
