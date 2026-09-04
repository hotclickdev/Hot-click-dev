import type { EstadoPedido, PedidoMock } from './mock'

export const FILTROS_PEDIDOS = ['Todos', 'Pendientes', 'Enviados', 'Entregados'] as const

export type FiltroPedidos = (typeof FILTROS_PEDIDOS)[number]

export function filtrarPedidos(pedidos: PedidoMock[], filtro: string): PedidoMock[] {
  if (filtro === 'Todos') return pedidos
  if (filtro === 'Pendientes') return pedidos.filter((p) => p.estado === 'Pendiente')
  if (filtro === 'Enviados') return pedidos.filter((p) => p.estado === 'Enviado')
  return pedidos.filter((p) => p.estado === 'Entregado')
}

export function estiloEstadoPedido(estado: EstadoPedido): { background: string; color: string } {
  if (estado === 'Entregado') return { background: 'var(--hc-success-bg)', color: 'var(--hc-success)' }
  if (estado === 'Enviado') return { background: 'var(--hc-info-bg)', color: 'var(--hc-info)' }
  if (estado === 'Cancelado') return { background: 'var(--hc-danger-bg)', color: 'var(--hc-danger)' }
  return { background: 'var(--hc-warning-bg)', color: 'var(--hc-warning)' }
}
