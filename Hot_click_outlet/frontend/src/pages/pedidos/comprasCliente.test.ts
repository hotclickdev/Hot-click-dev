import { describe, expect, it } from 'vitest'
import {
  agruparCompras,
  cantidadProductos,
  compraDelPaquete,
  envioCompra,
  envioUniforme,
  estadoCompra,
  fechaEntregaCompra,
  filtrarCompras,
  miniaturasCompra,
  paquetesEntregados,
  totalCompra,
  totalPaquetes,
} from './comprasCliente'
import type { PedidoCliente } from './pedidoHelpers'

function paquete(id: number, extra: Partial<PedidoCliente> = {}): PedidoCliente {
  return {
    id,
    numeroPedido: `ORD-${id}`,
    estadoPedido: 'PAGADO',
    totalPedido: 10000,
    costoEnvio: 4000,
    items: [{ cantidad: 1, nombreProducto: `Producto ${id}` }],
    ...extra,
  }
}

function compraDeTres(estados: string[]): PedidoCliente[] {
  return estados.map((estado, indice) => paquete(indice + 1, {
    compraId: 7,
    numeroCompra: 'ORD-100',
    cantidadPaquetes: estados.length,
    numeroPaquete: indice + 1,
    estadoPedido: estado,
  }))
}

describe('agruparCompras', () => {
  it('junta los paquetes de la misma compra y ordena por número de paquete', () => {
    const [p1, p2] = compraDeTres(['PAGADO', 'ENVIADO'])
    const compras = agruparCompras([p2, paquete(9), p1])
    expect(compras).toHaveLength(2)
    expect(compras[0].numero).toBe('ORD-100')
    expect(compras[0].paquetes.map((p) => p.id)).toEqual([1, 2])
    expect(compras[0].idDetalle).toBe(1)
    expect(compras[1].numero).toBe('ORD-9')
  })

  it('un pedido sin compra es su propia compra', () => {
    const compras = agruparCompras([paquete(1), paquete(2)])
    expect(compras.map((c) => c.clave)).toEqual(['pedido-1', 'pedido-2'])
  })
})

describe('estadoCompra', () => {
  const estado = (estados: string[]) => estadoCompra(agruparCompras(compraDeTres(estados))[0])

  it('en camino si algún paquete salió', () => {
    expect(estado(['PAGADO', 'ENVIADO', 'ENTREGADO'])).toBe('enCamino')
  })

  it('entregado cuando todos los activos llegaron', () => {
    expect(estado(['ENTREGADO', 'CANCELADO'])).toBe('entregado')
  })

  it('cancelado si no queda ningún paquete activo', () => {
    expect(estado(['CANCELADO', 'CANCELADO'])).toBe('cancelado')
  })

  it('pendiente si ninguno tiene pago confirmado', () => {
    expect(estado(['PENDIENTE', 'PENDIENTE'])).toBe('pendiente')
  })

  it('en preparación en cualquier otro caso', () => {
    expect(estado(['PAGADO', 'LISTO_RETIRO'])).toBe('enPreparacion')
  })
})

describe('filtrarCompras', () => {
  it('«todos» no filtra y los demás comparan contra el estado de la compra', () => {
    const compras = agruparCompras([paquete(1, { estadoPedido: 'ENTREGADO' }), paquete(2)])
    expect(filtrarCompras(compras, 'todos')).toHaveLength(2)
    expect(filtrarCompras(compras, 'entregado').map((c) => c.clave)).toEqual(['pedido-1'])
  })
})

describe('montos y conteos', () => {
  const compra = agruparCompras([
    ...compraDeTres(['ENTREGADO', 'ENVIADO']),
  ])[0]

  it('suma totales y envíos de todos los paquetes', () => {
    expect(totalCompra(compra)).toBe(20000)
    expect(envioCompra(compra)).toBe(8000)
    expect(envioUniforme(compra)).toBe(4000)
  })

  it('cuenta productos por cantidad y paquetes entregados', () => {
    expect(cantidadProductos(compra)).toBe(2)
    expect(paquetesEntregados(compra)).toBe(1)
  })

  it('envioUniforme es null si los costos difieren', () => {
    const [p1, p2] = compraDeTres(['PAGADO', 'PAGADO'])
    const distinta = agruparCompras([p1, { ...p2, costoEnvio: 2500 }])[0]
    expect(envioUniforme(distinta)).toBeNull()
  })

  it('totalPaquetes confía en cantidadPaquetes aunque falten paquetes en la página', () => {
    const [p1] = compraDeTres(['PAGADO', 'PAGADO', 'PAGADO'])
    expect(totalPaquetes(agruparCompras([p1])[0])).toBe(3)
  })
})

describe('miniaturasCompra', () => {
  it('toma a lo sumo dos productos, con url null si no hay foto', () => {
    const compra = agruparCompras([paquete(1, {
      items: [
        { nombreProducto: 'Taza', producto: { imagenPrincipalUrl: 'https://img/taza.jpg' } },
        { nombreProducto: 'Café' },
        { nombreProducto: 'Libreta' },
      ],
    })])[0]
    expect(miniaturasCompra(compra)).toEqual([
      { url: 'https://img/taza.jpg', nombre: 'Taza' },
      { url: null, nombre: 'Café' },
    ])
  })
})

describe('fechaEntregaCompra', () => {
  it('devuelve la entrega más reciente', () => {
    const [p1, p2] = compraDeTres(['ENTREGADO', 'ENTREGADO'])
    const compra = agruparCompras([
      { ...p1, fechaEntregaReal: '2026-09-27' },
      { ...p2, fechaEntregaReal: '2026-09-26' },
    ])[0]
    expect(fechaEntregaCompra(compra)).toBe('2026-09-27')
  })
})

describe('compraDelPaquete', () => {
  it('arma la compra con los hermanos del comprador', () => {
    const [p1, p2, p3] = compraDeTres(['PAGADO', 'ENVIADO', 'ENTREGADO'])
    const compra = compraDelPaquete(p2, [p3, paquete(40), p1, p2])
    expect(compra.paquetes.map((p) => p.id)).toEqual([1, 2, 3])
  })

  it('agrega el paquete si la lista no lo trae', () => {
    const [p1, p2] = compraDeTres(['PAGADO', 'ENVIADO'])
    expect(compraDelPaquete(p2, [p1]).paquetes.map((p) => p.id)).toEqual([1, 2])
  })

  it('un paquete sin compra queda solo', () => {
    expect(compraDelPaquete(paquete(5), [paquete(6)]).paquetes.map((p) => p.id)).toEqual([5])
  })
})
