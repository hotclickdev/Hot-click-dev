import { describe, expect, it } from 'vitest'
import {
  cantidadProductos, diasDeGarantia, envioDelPedido, filtrarPedidos, nombreTienda, paquetesEntregados,
  pedidoPorNumero, pedidosDelComprador, subtotalProductos, tiendasDelPedido, urlRastreo,
} from './pedidoVistaHelpers'
import type { PedidoCliente } from './pedidoHelpers'

const item = (nombre: string, precio: number, tienda: string): NonNullable<PedidoCliente['items']>[number] => ({
  cantidad: 1, nombreProducto: nombre, subtotalItem: precio, producto: { empresaNombre: tienda },
})

const ORDERS: PedidoCliente[] = [
  { id: 1, numeroPedido: 'ORD-1', grupoPago: 'G', estadoPedido: 'ENVIADO', totalPedido: 33400, costoEnvio: 4000, items: [item('Sofá', 17500, 'Casa Luna'), item('Auriculares', 11900, 'Casa Luna')] },
  { id: 2, numeroPedido: 'ORD-1', grupoPago: 'G', estadoPedido: 'EN_PREPARACION', totalPedido: 36000, costoEnvio: 4000, items: [item('Sillón', 32000, 'Bruma Café')] },
  { id: 3, numeroPedido: 'ORD-1', grupoPago: 'G', estadoPedido: 'ENTREGADO', totalPedido: 26500, costoEnvio: 4000, items: [item('Bloques', 22500, 'Taller Ceiba')] },
  { id: 4, numeroPedido: '1038', estadoPedido: 'EN_PREPARACION', totalPedido: 11900, items: [item('Auriculares', 11900, 'Casa Luna')] },
]

describe('pedidos agrupados por pago', () => {
  const pedidos = pedidosDelComprador(ORDERS)

  it('suma el total de los paquetes y cuenta productos y tiendas', () => {
    const grande = pedidos[0]
    expect(pedidos).toHaveLength(2)
    expect(grande.total).toBe(95900)
    expect(cantidadProductos(grande)).toBe(4)
    expect(tiendasDelPedido(grande)).toBe(3)
    expect(subtotalProductos(grande)).toBe(83900)
    expect(paquetesEntregados(grande)).toBe(1)
  })

  it('el envío se muestra como "N × precio" solo si todos los paquetes valen lo mismo', () => {
    expect(envioDelPedido(pedidos[0])).toEqual({ total: 12000, igual: 4000 })
    expect(envioDelPedido(pedidos[1]).igual).toBeNull()
  })

  it('los filtros usan el estado global del pedido', () => {
    expect(filtrarPedidos(pedidos, 'enCamino').map((p) => p.numero)).toEqual(['ORD-1'])
    expect(filtrarPedidos(pedidos, 'enPreparacion').map((p) => p.numero)).toEqual(['1038'])
    expect(filtrarPedidos(pedidos, 'cancelados')).toEqual([])
    expect(filtrarPedidos(pedidos, 'todos')).toHaveLength(2)
  })

  it('el detalle se busca por número de pedido', () => {
    expect(pedidoPorNumero(pedidos, 'ORD-1')?.paquetes).toHaveLength(3)
    expect(pedidoPorNumero(pedidos, 'otro')).toBeNull()
    expect(pedidoPorNumero(pedidos, null)).toBeNull()
  })

  it('el nombre de la tienda sale del producto cuando el backend no lo manda en el pedido', () => {
    expect(nombreTienda(ORDERS[1])).toBe('Bruma Café')
    expect(nombreTienda({ id: 9, nombreEmpresa: 'Tienda X' })).toBe('Tienda X')
  })
})

describe('garantía y rastreo', () => {
  it('quedan días de garantía hasta 40 días después de la entrega', () => {
    const ahora = new Date('2026-10-01T00:00:00').getTime()
    expect(diasDeGarantia({ fechaEntregaReal: '2026-09-26' }, ahora)).toBe(35)
    expect(diasDeGarantia({ fechaEntregaReal: '2026-06-01' }, ahora)).toBe(0)
    expect(diasDeGarantia({}, ahora)).toBe(0)
  })

  it('solo se acepta un enlace de rastreo https; si no, el rastreo oficial de Correos', () => {
    expect(urlRastreo({ numeroGuia: 'CR1', urlTracking: 'https://correos.go.cr/x' })).toBe('https://correos.go.cr/x')
    expect(urlRastreo({ numeroGuia: 'CR1', urlTracking: 'javascript:alert(1)' })).toBe('https://rastreo.correos.go.cr/?codigo=CR1')
    expect(urlRastreo({ numeroGuia: 'CR1', urlTracking: 'http://inseguro.com' })).toBe('https://rastreo.correos.go.cr/?codigo=CR1')
    expect(urlRastreo({})).toBeNull()
  })
})
