import { describe, expect, it } from 'vitest'
import { METODO_ENVIO_DOMICILIO, METODO_ENVIO_RETIRO, costoEnvioTienda } from './tiendaCheckoutValidacion'
import { SHIPPING_COSTS } from '@/pages/checkout/checkoutHelpers'

describe('envío en el total de la tienda (MED-3 Auditor 3 c)', () => {
  it('domicilio en el GAM suma Envío Normal GAM; retiro no', () => {
    expect(costoEnvioTienda(METODO_ENVIO_DOMICILIO, 'San José', 'Escazú')).toBe(SHIPPING_COSTS.ENVIO_NORMAL_GAM)
    expect(costoEnvioTienda(METODO_ENVIO_RETIRO, 'San José', 'Escazú')).toBe(0)
  })
  it('fuera del GAM o sin destino cobra fuera del GAM, igual que el servidor', () => {
    expect(costoEnvioTienda(METODO_ENVIO_DOMICILIO, 'Limón', 'Siquirres')).toBe(SHIPPING_COSTS.ENVIO_NORMAL_FUERA_GAM)
    expect(costoEnvioTienda(METODO_ENVIO_DOMICILIO)).toBe(SHIPPING_COSTS.ENVIO_NORMAL_FUERA_GAM)
    expect(SHIPPING_COSTS.ENVIO_NORMAL_FUERA_GAM).toBe(5500)
  })
})
