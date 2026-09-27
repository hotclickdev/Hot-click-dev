import { describe, expect, it } from 'vitest'
import es from '@/i18n/locales/es.json'
import { formatPrice } from '@/utils/format'
import { agruparCompras, type CompraCliente } from './comprasCliente'
import type { PedidoCliente } from './pedidoHelpers'
import {
  lineaEnvio,
  lineaGuia,
  mensajeWhatsApp,
  montoProductos,
  origenPaquete,
  pagadoCon,
  pieTarjeta,
  resumenPaquetes,
  textoSinGuia,
  type Traducir,
} from './textosPedido'

function buscar(ruta: string): unknown {
  return ruta.split('.').reduce<unknown>(
    (nodo, parte) => (nodo && typeof nodo === 'object' ? (nodo as Record<string, unknown>)[parte] : undefined),
    es,
  )
}

/** `t` mínimo sobre es.json: plural `_one`/`_other` con caída a la clave simple e interpolación `{{x}}`. */
const t: Traducir = (clave, opciones = {}) => {
  const { count, defaultValue } = opciones
  const plural = typeof count === 'number' ? buscar(`${clave}_${count === 1 ? 'one' : 'other'}`) : undefined
  const valor = plural ?? buscar(clave)
  if (typeof valor !== 'string') return typeof defaultValue === 'string' ? defaultValue : clave
  return valor.replace(/\{\{(\w+)\}\}/g, (_, nombre: string) => String(opciones[nombre] ?? ''))
}

function paquete(numero: number, extra: Partial<PedidoCliente> = {}): PedidoCliente {
  return {
    id: numero,
    compraId: 1,
    numeroCompra: 'ORD-10482',
    numeroPaquete: numero,
    cantidadPaquetes: 3,
    estadoPedido: 'ENVIADO',
    totalPedido: 30000,
    costoEnvio: 4000,
    fechaPedido: '2026-09-24T10:00:00',
    metodoPago: 'SINPE',
    nombreNegocio: `Tienda ${numero}`,
    items: [{ cantidad: 2, nombreProducto: 'Taza' }],
    ...extra,
  }
}

function compra(paquetes: PedidoCliente[]): CompraCliente {
  return agruparCompras(paquetes)[0]
}

const tres = () => compra([paquete(1, { estadoPedido: 'ENTREGADO' }), paquete(2), paquete(3, { estadoPedido: 'PAGADO' })])

describe('resumen de la compra', () => {
  it('«3 paquetes · 1 entregado»', () => {
    expect(resumenPaquetes(t, tres())).toBe('3 paquetes · 1 entregado')
  })

  it('sin entregas queda solo la cantidad de paquetes', () => {
    expect(resumenPaquetes(t, compra([paquete(1), paquete(2)]))).toBe('3 paquetes')
  })

  it('fecha y método de pago', () => {
    expect(pagadoCon(t, tres(), 'es')).toBe('24 set. 2026 · pagado con SINPE Móvil')
  })

  it('sin método conocido muestra solo la fecha', () => {
    expect(pagadoCon(t, compra([paquete(1, { metodoPago: 'RARO' })]), 'es')).toBe('24 set. 2026')
  })

  it('envío por paquete y monto de productos', () => {
    const laCompra = tres()
    expect(lineaEnvio(t, laCompra)).toBe(`Envío · 3 paquetes × ${formatPrice(4000)}`)
    expect(montoProductos(laCompra, 90000)).toBe(78000)
  })

  it('un solo paquete dice solo «Envío»', () => {
    expect(lineaEnvio(t, compra([paquete(1, { cantidadPaquetes: 1 })]))).toBe('Envío')
  })
})

describe('pieTarjeta', () => {
  it('compra con varios paquetes muestra el resumen', () => {
    expect(pieTarjeta(t, tres(), 'es')).toBe('3 paquetes · 1 entregado')
  })

  it('paquete único entregado dice el día', () => {
    const unico = compra([paquete(1, { cantidadPaquetes: 1, estadoPedido: 'ENTREGADO', fechaEntregaReal: '2026-09-26' })])
    expect(pieTarjeta(t, unico, 'es')).toBe('Entregado el 26 de set.')
  })

  it('paquete único en camino', () => {
    expect(pieTarjeta(t, compra([paquete(1, { cantidadPaquetes: 1 })]), 'es')).toBe('Tu pedido va en camino')
  })
})

describe('textos del paquete', () => {
  it('origen con provincia de la bodega', () => {
    expect(origenPaquete(t, paquete(1, { bodega: { provincia: 'San José' } }))).toBe(`Sale de San José · envío ${formatPrice(4000)}`)
  })

  it('origen sin provincia', () => {
    expect(origenPaquete(t, paquete(1))).toBe(`Envío ${formatPrice(4000)}`)
  })

  it('guía enviada con ventana de llegada en el mismo mes', () => {
    expect(lineaGuia(t, paquete(1, { fechaEnvio: '2026-09-21' }), 'es')).toBe('Salió el 21 set. · llega entre el 23 y 25 set.')
  })

  it('ventana que cruza de mes nombra los dos meses', () => {
    expect(lineaGuia(t, paquete(1, { fechaEnvio: '2026-09-25' }), 'es')).toBe('Salió el 25 set. · llega entre el 29 set. y 1 oct.')
  })

  it('entregado muestra la fecha de entrega', () => {
    const entregado = paquete(1, { estadoPedido: 'ENTREGADO', fechaEntregaReal: '2026-09-26' })
    expect(lineaGuia(t, entregado, 'es')).toBe('Entregado el 26 set.')
  })

  it('sin fecha de envío no hay segunda línea', () => {
    expect(lineaGuia(t, paquete(1), 'es')).toBeNull()
  })

  it('caja sin guía según el estado', () => {
    expect(textoSinGuia(t, paquete(2, { estadoPedido: 'PAGADO' }))).toContain('Tienda 2 está preparando tu paquete')
    expect(textoSinGuia(t, paquete(2, { estadoPedido: 'PENDIENTE' }))).toBe('Guía pendiente: estamos confirmando tu pago.')
    expect(textoSinGuia(t, paquete(2, { estadoPedido: 'CANCELADO' }))).toBe('Este paquete se canceló.')
    expect(textoSinGuia(t, paquete(2, { estadoPedido: 'LISTO_RETIRO' }))).toBe('Tu paquete está listo para retirar en Tienda 2.')
  })

  it('mensaje de WhatsApp con paquete, compra y tienda', () => {
    expect(mensajeWhatsApp(t, tres(), paquete(2))).toBe(
      'Hola HotClick, consulto por el paquete 2 de 3 del pedido ORD-10482 (Tienda 2).',
    )
  })
})
