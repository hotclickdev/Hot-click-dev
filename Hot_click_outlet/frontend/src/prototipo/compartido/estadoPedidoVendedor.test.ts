import { describe, expect, it } from 'vitest'
import {
  ESTADOS_SIN_VENTA,
  estadoPedidoVendedor,
  mensajeErrorDespacho,
  pagaAlRetirar,
  puedeDespachar,
} from './estadoPedidoVendedor'
import { aPedidoEmprendedor } from './pedidosVendedorApi'
import type { Pedido } from '@/types/pedido'

describe('estadoPedidoVendedor (BUG-02)', () => {
  it.each(['PENDIENTE', 'PENDIENTE_COMPROBANTE', 'PENDIENTE_APROBACION', 'pendiente_comprobante', '', undefined, null])(
    '%s → Esperando pago (sin pago confirmado, no se despacha)',
    (estado) => {
      const visible = estadoPedidoVendedor(estado)
      expect(visible).toBe('Esperando pago')
      expect(puedeDespachar(visible)).toBe(false)
    },
  )

  it.each(['PAGADO', 'EN_PREPARACION', 'LISTO_RETIRO', 'CONFIRMADO', 'PREPARANDO'])(
    '%s → Pendiente (pago confirmado, por despachar)',
    (estado) => {
      const visible = estadoPedidoVendedor(estado)
      expect(visible).toBe('Pendiente')
      expect(puedeDespachar(visible)).toBe(true)
    },
  )

  it('enviado, entregado, completado y cancelado no se despachan', () => {
    expect(estadoPedidoVendedor('ENVIADO')).toBe('Enviado')
    expect(estadoPedidoVendedor('ENTREGADO')).toBe('Entregado')
    expect(estadoPedidoVendedor('COMPLETADO')).toBe('Entregado')
    expect(estadoPedidoVendedor('CANCELADO')).toBe('Cancelado')
    for (const e of ['ENVIADO', 'ENTREGADO', 'COMPLETADO', 'CANCELADO']) {
      expect(puedeDespachar(estadoPedidoVendedor(e))).toBe(false)
    }
  })

  it('los reportes excluyen los mismos pedidos que antes (sin pago, por despachar y cancelados)', () => {
    expect([...ESTADOS_SIN_VENTA].sort((a, b) => a.localeCompare(b))).toEqual(['Cancelado', 'Esperando pago', 'Pendiente'])
  })

  it('aPedidoEmprendedor usa el estado del listado del vendedor', () => {
    const sinpe = { id: 4, estado: 'PENDIENTE_COMPROBANTE', items: [] } as unknown as Pedido
    const pagado = { id: 5, estadoPedido: 'PAGADO', items: [] } as unknown as Pedido
    expect(aPedidoEmprendedor(sinpe).estado).toBe('Esperando pago')
    expect(aPedidoEmprendedor(pagado).estado).toBe('Pendiente')
  })
})

describe('mensajeErrorDespacho', () => {
  const generico = 'No se pudo marcar el pedido como enviado.'

  it('409: muestra el motivo del backend', () => {
    const err = {
      response: {
        status: 409,
        data: { message: 'El pago de este pedido todavía no está confirmado. Podés despacharlo cuando se confirme el pago.' },
      },
    }
    expect(mensajeErrorDespacho(err, generico)).toBe(
      'El pago de este pedido todavía no está confirmado. Podés despacharlo cuando se confirme el pago.',
    )
  })

  it('otros errores: genérico (sin texto crudo)', () => {
    expect(mensajeErrorDespacho({ response: { status: 400, data: { message: 'NullPointerException' } } }, generico)).toBe(generico)
    expect(mensajeErrorDespacho({ response: { status: 409, data: {} } }, generico)).toBe(generico)
    expect(mensajeErrorDespacho(new Error('Network Error'), generico)).toBe(generico)
    expect(mensajeErrorDespacho(undefined, generico)).toBe(generico)
  })
})

describe('efectivo con retiro (paga al retirar)', () => {
  it('EFECTIVO + RETIRO_EN_TIENDA en PENDIENTE_COMPROBANTE no es "Esperando pago" y se puede entregar', () => {
    const datos = { metodoPago: 'efectivo', metodoEnvio: 'RETIRO_EN_TIENDA' }
    expect(pagaAlRetirar('PENDIENTE_COMPROBANTE', datos)).toBe(true)
    const visible = estadoPedidoVendedor('PENDIENTE_COMPROBANTE', datos)
    expect(visible).toBe('Pendiente')
    expect(puedeDespachar(visible)).toBe(true)
  })

  it.each([
    ['EFECTIVO', 'ENVIO_A_DOMICILIO', 'PENDIENTE_COMPROBANTE'],
    ['SINPE', 'RETIRO_EN_TIENDA', 'PENDIENTE_COMPROBANTE'],
    ['TILOPAY', 'RETIRO_EN_TIENDA', 'PENDIENTE'],
    ['EFECTIVO', 'RETIRO_EN_TIENDA', 'PENDIENTE'],
  ])('%s + %s en %s sigue en "Esperando pago"', (metodoPago, metodoEnvio, estado) => {
    expect(pagaAlRetirar(estado, { metodoPago, metodoEnvio })).toBe(false)
    expect(estadoPedidoVendedor(estado, { metodoPago, metodoEnvio })).toBe('Esperando pago')
  })

  it('aPedidoEmprendedor marca pagaAlRetirar solo para efectivo con retiro', () => {
    const base = { id: 7, estadoPedido: 'PENDIENTE_COMPROBANTE', totalPedido: 1000 } as Pedido
    const retiro = aPedidoEmprendedor({ ...base, metodoPago: 'EFECTIVO', metodoEnvio: 'RETIRO_EN_TIENDA' } as Pedido)
    expect(retiro.estado).toBe('Pendiente')
    expect(retiro.pagaAlRetirar).toBe(true)
    const envio = aPedidoEmprendedor({ ...base, metodoPago: 'EFECTIVO', metodoEnvio: 'ENVIO_A_DOMICILIO' } as Pedido)
    expect(envio.estado).toBe('Esperando pago')
    expect(envio.pagaAlRetirar).toBe(false)
  })
})
