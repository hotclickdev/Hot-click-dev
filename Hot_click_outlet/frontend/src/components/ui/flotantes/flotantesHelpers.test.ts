import { describe, expect, it } from 'vitest'
import { ALTO_BARRA_INFERIOR, SEPARACION_FLOTANTE, TAMANO_WHATSAPP, esFichaProducto, whatsappOculto } from './flotantesHelpers'

describe('esFichaProducto', () => {
  it('detecta la ficha y no el catálogo', () => {
    expect(esFichaProducto('/productos/12')).toBe(true)
    expect(esFichaProducto('/productos/12/opiniones')).toBe(true)
    expect(esFichaProducto('/productos')).toBe(false)
    expect(esFichaProducto('/')).toBe(false)
  })
})

describe('whatsappOculto', () => {
  it('se oculta en auth, carrito, pago y paneles', () => {
    for (const ruta of ['/login', '/registro', '/carrito', '/checkout', '/checkout/pago', '/pago/exito', '/admin/pedidos', '/pos/caja']) {
      expect(whatsappOculto(ruta, false, false)).toBe(true)
    }
  })
  it('se oculta en la tienda del vendedor y en el prototipo', () => {
    expect(whatsappOculto('/tienda/casa-luna', true, false)).toBe(true)
    expect(whatsappOculto('/prototipo/x', false, true)).toBe(true)
  })
  it('se muestra en Home, catálogo y ficha', () => {
    for (const ruta of ['/', '/productos', '/productos/3', '/mis-pedidos']) {
      expect(whatsappOculto(ruta, false, false)).toBe(false)
    }
  })
})

describe('medidas de Figma 52:2418', () => {
  it('el botón queda a 16 px sobre la barra de 67 px', () => {
    expect(ALTO_BARRA_INFERIOR + SEPARACION_FLOTANTE).toBe(83)
    expect(TAMANO_WHATSAPP).toBe(56)
  })
})
