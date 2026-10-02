import { describe, expect, it } from 'vitest'
import {
  construirEventos, estadoGlobal, etiquetaPedido, fechaConAnio, fechaCorta, haceCuanto, iniciales,
  pedidoEnCurso, productosPendientesDeOpinar, resumenDePedidos,
} from './cuentaHelpers'
import type { PedidoCliente } from '../../pedidos/pedidoHelpers'

const GRUPO: PedidoCliente[] = [
  { id: 1, numeroPedido: 'ORD-1', grupoPago: 'G1', estadoPedido: 'ENVIADO', fechaPedido: '2026-09-24T10:00:00', numeroGuia: 'CR1' },
  { id: 2, numeroPedido: 'ORD-1', grupoPago: 'G1', estadoPedido: 'EN_PREPARACION', fechaPedido: '2026-09-24T10:00:00' },
  { id: 3, numeroPedido: 'ORD-1', grupoPago: 'G1', estadoPedido: 'ENTREGADO', fechaPedido: '2026-09-24T10:00:00' },
]

describe('nombres y números', () => {
  it('las iniciales coinciden con las del header (primera y última palabra)', () => {
    expect(iniciales('María Rojas Solano')).toBe('MS')
    expect(iniciales('Ana')).toBe('AN')
    expect(iniciales(null)).toBe('?')
  })

  it('"#1042" para números de solo dígitos y el número tal cual si trae prefijo', () => {
    expect(etiquetaPedido('1042')).toBe('#1042')
    expect(etiquetaPedido('ORD-10482')).toBe('ORD-10482')
    expect(etiquetaPedido(undefined)).toBe('')
  })
})

describe('pedidos del comprador', () => {
  it('un pago con varios paquetes cuenta como un solo pedido', () => {
    const orders: PedidoCliente[] = [...GRUPO, { id: 9, numeroPedido: '9', estadoPedido: 'ENTREGADO' }]
    expect(resumenDePedidos(orders)).toEqual({ total: 2, enCamino: 1 })
  })

  it('el estado global destaca lo que va en camino y solo es entregado si todo lo está', () => {
    expect(estadoGlobal(GRUPO)).toBe('ENVIADO')
    expect(estadoGlobal([{ estadoPedido: 'ENTREGADO' }, { estadoPedido: 'ENTREGADO' }])).toBe('ENTREGADO')
    expect(estadoGlobal([{ estadoPedido: 'PAGADO' }, { estadoPedido: 'EN_PREPARACION' }])).toBe('PAGADO')
    expect(estadoGlobal([{ estadoPedido: 'CANCELADO' }])).toBe('CANCELADO')
  })

  it('el pedido en curso es el primero que no terminó, con todos sus paquetes', () => {
    expect(pedidoEnCurso(GRUPO)?.map((p) => p.id)).toEqual([1, 2, 3])
    expect(pedidoEnCurso([{ id: 5, estadoPedido: 'ENTREGADO' }])).toBeNull()
  })
})

describe('opiniones pendientes', () => {
  it('solo entran productos que aún no tienen opinión y que se pueden reseñar', () => {
    const lista = [
      { productoId: 1, resenasEnviadas: 0, puedeResenar: true },
      { productoId: 2, resenasEnviadas: 1, puedeResenar: true },
      { productoId: 3, resenasEnviadas: 0, puedeResenar: false },
    ]
    expect(productosPendientesDeOpinar(lista).map((p) => p.productoId)).toEqual([1])
  })
})

describe('actividad reciente', () => {
  it('mezcla pedidos, solicitudes y opiniones, ordena por fecha y respeta el límite', () => {
    const eventos = construirEventos(
      GRUPO,
      [{ id: 7, estado: 'ENCONTRADO', fechaCreacion: '2026-09-27T09:00:00', descripcion: 'Lámpara' }],
      [{ productoId: 4, nombre: 'Sérum', puedeResenar: true, resenasEnviadas: 0 }],
    )
    expect(eventos.map((e) => e.tipo)).toEqual(['solicitud', 'pedido', 'opinion'])
    expect(eventos[0].titulo.clave).toBe('cuenta.actividad.solicitudCotizada')
    expect(eventos[1].titulo.clave).toBe('cuenta.actividad.pedidoSalio')
    expect(eventos[1].detalle?.valores.guia).toBe('CR1')
    expect(construirEventos(GRUPO, [], [], 1)).toHaveLength(1)
  })

  it('"hace" usa minutos, horas y días', () => {
    const ahora = new Date('2026-09-27T12:00:00').getTime()
    expect(haceCuanto('2026-09-27T11:30:00', ahora)).toEqual({ clave: 'cuenta.hace.minutos', valores: { count: 30 } })
    expect(haceCuanto('2026-09-27T10:00:00', ahora)).toEqual({ clave: 'cuenta.hace.horas', valores: { count: 2 } })
    expect(haceCuanto('2026-09-25T12:00:00', ahora)).toEqual({ clave: 'cuenta.hace.dias', valores: { count: 2 } })
    expect(haceCuanto('', ahora)).toBeNull()
  })
})

describe('fechas', () => {
  it('en español de Costa Rica setiembre se escribe "set."', () => {
    expect(fechaCorta('2026-09-28', 'es')).toBe('28 de set.')
    expect(fechaConAnio('2026-09-24', 'es')).toBe('24 set. 2026')
  })

  it('en inglés va el mes primero', () => {
    expect(fechaCorta('2026-09-28', 'en')).toBe('Sep 28')
    expect(fechaConAnio('2026-09-24', 'en')).toBe('Sep 24, 2026')
  })

  it('una fecha vacía o inválida da texto vacío', () => {
    expect(fechaCorta(null, 'es')).toBe('')
    expect(fechaConAnio('hola', 'es')).toBe('')
  })
})
