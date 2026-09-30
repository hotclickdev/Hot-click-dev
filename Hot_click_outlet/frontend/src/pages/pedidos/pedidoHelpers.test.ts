import { describe, expect, it } from 'vitest'
import { agruparPedidosPorPaquete } from './pedidoHelpers'
import type { PedidoCliente } from './pedidoHelpers'

describe('agruparPedidosPorPaquete', () => {
  it('agrupa pedidos que comparten grupoPago', () => {
    const pedidos: PedidoCliente[] = [
      { id: 1, numeroPedido: 'ORD-1', grupoPago: 'G1' },
      { id: 2, numeroPedido: 'ORD-2', grupoPago: 'G1' },
      { id: 3, numeroPedido: 'ORD-3' },
    ]
    const grupos = agruparPedidosPorPaquete(pedidos)
    expect(grupos).toHaveLength(2)
    expect(grupos[0]).toEqual({ grupoPago: 'G1', pedidos: [pedidos[0], pedidos[1]] })
    expect(grupos[1]).toEqual({ grupoPago: null, pedidos: [pedidos[2]] })
  })

  it('sin grupoPago cada pedido queda como grupo propio (compatibilidad hacia atrás)', () => {
    const pedidos: PedidoCliente[] = [{ id: 1 }, { id: 2 }, { id: 3 }]
    const grupos = agruparPedidosPorPaquete(pedidos)
    expect(grupos).toHaveLength(3)
    expect(grupos.every((g) => g.pedidos.length === 1 && g.grupoPago === null)).toBe(true)
  })

  it('preserva el orden de llegada de los grupos', () => {
    const pedidos: PedidoCliente[] = [
      { id: 1, grupoPago: 'A' },
      { id: 2, grupoPago: 'B' },
      { id: 3, grupoPago: 'A' },
    ]
    const grupos = agruparPedidosPorPaquete(pedidos)
    expect(grupos.map((g) => g.grupoPago)).toEqual(['A', 'B'])
    expect(grupos[0].pedidos.map((p) => p.id)).toEqual([1, 3])
  })
})
