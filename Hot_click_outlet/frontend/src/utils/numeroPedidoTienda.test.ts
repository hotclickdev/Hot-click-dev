import { describe, expect, it } from 'vitest'
import { etiquetaPedido, numeroVisiblePedido } from './numeroPedidoTienda'

describe('S4-20 número de pedido por tienda', () => {
  it('muestra numeroTienda cuando el backend lo manda', () => {
    expect(etiquetaPedido({ numeroTienda: 37, numeroPedido: 'ORD-20261016-AB12' })).toBe('Pedido #37')
    expect(numeroVisiblePedido({ numeroTienda: 1 })).toBe('#1')
  })

  it('pedidos viejos (numeroTienda null) conservan numeroPedido', () => {
    expect(etiquetaPedido({ numeroTienda: null, numeroPedido: 'ORD-20261016-AB12' })).toBe('Pedido ORD-20261016-AB12')
    expect(etiquetaPedido({ numeroPedido: ' ORD-1 ' })).toBe('Pedido ORD-1')
  })

  it('nunca cae al id interno', () => {
    const conId = { id: 4821, numeroTienda: null, numeroPedido: null }
    expect(etiquetaPedido(conId)).toBe('Pedido')
    expect(etiquetaPedido(conId)).not.toContain('4821')
    expect(numeroVisiblePedido(undefined)).toBe('')
  })

  it('ignora valores que no son enteros positivos', () => {
    expect(etiquetaPedido({ numeroTienda: 0, numeroPedido: 'ORD-9' })).toBe('Pedido ORD-9')
    expect(etiquetaPedido({ numeroTienda: Number.NaN, numeroPedido: 'ORD-9' })).toBe('Pedido ORD-9')
  })
})
