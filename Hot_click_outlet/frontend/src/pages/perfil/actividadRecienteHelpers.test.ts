import { describe, expect, it } from 'vitest'
import { construirActividad, pedidoActivo } from './actividadRecienteHelpers'
import type { PedidoCliente } from '../pedidos/pedidoHelpers'

describe('pedidoActivo', () => {
  it('devuelve el primer pedido en un estado en curso', () => {
    const orders: PedidoCliente[] = [
      { id: 1, estadoPedido: 'ENTREGADO' },
      { id: 2, estadoPedido: 'ENVIADO' },
    ]
    expect(pedidoActivo(orders)?.id).toBe(2)
  })

  it('devuelve null si ningún pedido está en curso', () => {
    const orders: PedidoCliente[] = [{ id: 1, estadoPedido: 'ENTREGADO' }, { id: 2, estadoPedido: 'CANCELADO' }]
    expect(pedidoActivo(orders)).toBeNull()
  })
})

describe('construirActividad', () => {
  it('fusiona pedidos, solicitudes y reseñas pendientes ordenados por fecha', () => {
    const orders: PedidoCliente[] = [
      { id: 1, numeroPedido: 'ORD-1', fechaPedido: '2026-09-20', estadoPedido: 'ENVIADO' },
    ]
    const solicitudes = [{ id: 's1', estado: 'COTIZADA', fechaCreacion: '2026-09-25' }]
    const resenas = [{ productoId: 9, nombre: 'Sofá', yaReseno: false }]

    const items = construirActividad(orders, solicitudes, resenas)
    expect(items.map((i) => i.tipo)).toEqual(['solicitud', 'pedido', 'resena'])
  })

  it('excluye productos que ya tienen reseña', () => {
    const items = construirActividad([], [], [{ productoId: 1, yaReseno: true }])
    expect(items).toHaveLength(0)
  })

  it('respeta el límite', () => {
    const orders: PedidoCliente[] = Array.from({ length: 10 }, (_, i) => ({
      id: i, numeroPedido: `ORD-${i}`, fechaPedido: `2026-09-${10 + i}`,
    }))
    expect(construirActividad(orders, [], [], 3)).toHaveLength(3)
  })
})
