import { describe, expect, it } from 'vitest'
import { guardarTokenEstadoPago, rutaEstadoPago, tokenEstadoValido } from './estadoPagoCheckout'
import { claveTokenEstado, tokenEstadoPago } from './privacidadToken'

const TOKEN = 'c'.repeat(64)

function memoria() {
  const m = new Map<string, string>()
  return { m, storage: { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) } } }
}

describe('S4-22 checkout → estado del pago (#207)', () => {
  it('guarda estadoPagoToken con la clave que lee la página de #179', () => {
    const { m, storage } = memoria()
    expect(guardarTokenEstadoPago({ numeroPedido: 'ORD-1', estadoPagoToken: TOKEN }, storage)).toBe(true)
    expect(m.get(claveTokenEstado('ORD-1'))).toBe(TOKEN)
    expect(tokenEstadoPago('ORD-1', '', storage)).toBe(TOKEN)
  })

  it('no guarda tokens inválidos ni el cancelToken', () => {
    const { m, storage } = memoria()
    expect(guardarTokenEstadoPago({ numeroPedido: 'ORD-1', estadoPagoToken: 'corto' }, storage)).toBe(false)
    expect(guardarTokenEstadoPago({ numeroPedido: 'ORD-1' }, storage)).toBe(false)
    expect(guardarTokenEstadoPago({ estadoPagoToken: TOKEN }, storage)).toBe(false)
    expect(guardarTokenEstadoPago({ numeroPedido: 'ORD-1', estadoPagoToken: TOKEN }, null)).toBe(false)
    expect(m.size).toBe(0)
    expect(tokenEstadoValido(TOKEN.toUpperCase())).toBe(true)
  })

  it('SINPE pendiente dentro de ONVO va a /checkout/pendiente/{numero} sin el token en la URL', () => {
    const ruta = rutaEstadoPago({ numeroPedido: 'ORD 1', estadoPagoToken: TOKEN, proveedor: 'ONVO' })
    expect(ruta).toBe('/checkout/pendiente/ORD%201')
    expect(ruta).not.toContain(TOKEN)
    expect(ruta).not.toContain('token')
  })

  it('no aplica a efectivo, gift card, redirección a ONVO ni backend sin token', () => {
    expect(rutaEstadoPago({ numeroPedido: 'ORD-1', estadoPagoToken: TOKEN, proveedor: 'EFECTIVO' })).toBeNull()
    expect(rutaEstadoPago({ numeroPedido: 'ORD-1', estadoPagoToken: TOKEN, proveedor: 'GIFT_CARD' })).toBeNull()
    expect(rutaEstadoPago({ numeroPedido: 'ORD-1', estadoPagoToken: TOKEN, redirectUrl: 'https://checkout.onvopay.com/x' })).toBeNull()
    expect(rutaEstadoPago({ numeroPedido: 'ORD-1', proveedor: 'SINPE' })).toBeNull()
    expect(rutaEstadoPago(null)).toBeNull()
  })
})
