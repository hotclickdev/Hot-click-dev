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
  })
})
