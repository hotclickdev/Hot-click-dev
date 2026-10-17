import { describe, expect, it } from 'vitest'
import { METODO_ENVIO_DOMICILIO, METODO_ENVIO_RETIRO, costoEnvioTienda } from './tiendaCheckoutValidacion'

describe('envío en el total de la tienda', () => {
  it('domicilio suma Envío Normal GAM; retiro no', () => {
    const tarifas = { ENVIO_NORMAL_GAM: 4000 }
    expect(costoEnvioTienda(METODO_ENVIO_DOMICILIO, tarifas)).toBe(4000)
    expect(costoEnvioTienda(METODO_ENVIO_RETIRO, tarifas)).toBe(0)
    expect(costoEnvioTienda(METODO_ENVIO_DOMICILIO, {})).toBe(0)
  })
})
