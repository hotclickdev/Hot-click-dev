import { describe, expect, it } from 'vitest'
import { BODEGA_DEFAULT, bodegaIdDelCheckout } from './checkoutHelpers'

describe('bodegaIdDelCheckout', () => {
  const retiro = { id: 54, nombre: 'Tienda 54' }

  it('sin retiro manda null, nunca la bodega 1', () => {
    expect(bodegaIdDelCheckout('ENVIO_NORMAL_GAM', retiro)).toBeNull()
    expect(bodegaIdDelCheckout('ENVIO_A_DOMICILIO', null)).toBeNull()
    expect(bodegaIdDelCheckout('ENVIO_NORMAL_GAM', null)).not.toBe(BODEGA_DEFAULT)
  })

  it('con retiro manda la bodega de retiro', () => {
    expect(bodegaIdDelCheckout('RETIRO_EN_TIENDA', retiro)).toBe(54)
  })

  it('retiro sin bodega elegida manda null (el backend valida por paquete)', () => {
    expect(bodegaIdDelCheckout('RETIRO_EN_TIENDA', null)).toBeNull()
  })
})
