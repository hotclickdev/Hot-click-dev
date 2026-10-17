import { describe, expect, it } from 'vitest'
import { filtrarPedidos, estiloEstadoPedido } from './pedidosListaHelpers'
import type { PedidoMock } from './mock'

const base: Omit<PedidoMock, 'id' | 'estado'> = {
  cliente: 'Ana',
  total: 1000,
  fecha: '2026-01-01',
  direccion: 'SJ',
  items: [],
}

describe('pedidosListaHelpers', () => {
  const pedidos: PedidoMock[] = [
    { ...base, id: '1', estado: 'Pendiente' },
    { ...base, id: '2', estado: 'Enviado' },
    { ...base, id: '3', estado: 'Entregado' },
  ]

  it('Pendientes incluye los que esperan pago (no desaparecen del chip)', () => {
    const conEspera: PedidoMock[] = [...pedidos, { ...base, id: '4', estado: 'Esperando pago' }]
    expect(filtrarPedidos(conEspera, 'Pendientes').map((p) => p.id)).toEqual(['1', '4'])
    expect(filtrarPedidos(conEspera, 'Todos')).toHaveLength(4)
  })

  it('filtrarPedidos por chip', () => {
    expect(filtrarPedidos(pedidos, 'Todos')).toHaveLength(3)
    expect(filtrarPedidos(pedidos, 'Pendientes').map((p) => p.id)).toEqual(['1'])
    expect(filtrarPedidos(pedidos, 'Enviados').map((p) => p.id)).toEqual(['2'])
    expect(filtrarPedidos(pedidos, 'Entregados').map((p) => p.id)).toEqual(['3'])
  })

  it('estiloEstadoPedido distingue tonos', () => {
    expect(estiloEstadoPedido('Entregado').color).toBe('var(--hc-success)')
    expect(estiloEstadoPedido('Cancelado').color).toBe('var(--hc-danger)')
    expect(estiloEstadoPedido('Pendiente').color).toBe('var(--hc-warning)')
    expect(estiloEstadoPedido('Esperando pago').color).toBe('var(--hc-warning)')
  })
})

describe('QA-NEG-061/027 título y hora del pedido', () => {
  it('usa el código ORD y no el id global', async () => {
    const { tituloPedido } = await import('./pedidosListaHelpers')
    expect(tituloPedido({ id: '56', numeroPedido: 'ORD-0F62293FA211' })).toBe('Pedido ORD-0F62293FA211')
    expect(tituloPedido({ id: '56' })).toBe('Pedido #56')
  })
  it('muestra fecha y hora de Costa Rica', async () => {
    const { fechaHoraPedido } = await import('./pedidosListaHelpers')
    expect(fechaHoraPedido('2026-10-16T23:05:00Z')).toBe('16/10/2026 17:05')
    expect(fechaHoraPedido('')).toBe('')
    expect(fechaHoraPedido('nada')).toBe('')
  })
})
