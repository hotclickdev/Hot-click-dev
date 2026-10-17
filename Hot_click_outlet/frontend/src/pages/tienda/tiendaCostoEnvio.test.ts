import { describe, expect, it } from 'vitest'
import { METODO_ENVIO_DOMICILIO, METODO_ENVIO_RETIRO, costoEnvioTienda } from './tiendaCheckoutValidacion'
import { SHIPPING_COSTS } from '@/pages/checkout/checkoutHelpers'

describe('envío en el total de la tienda', () => {
  it('domicilio suma Envío Normal GAM; retiro no', () => {
    expect(costoEnvioTienda(METODO_ENVIO_DOMICILIO)).toBe(SHIPPING_COSTS.ENVIO_NORMAL_GAM)
    expect(costoEnvioTienda(METODO_ENVIO_RETIRO)).toBe(0)
  })
})
