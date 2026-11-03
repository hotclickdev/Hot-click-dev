import { describe, expect, it } from 'vitest'
import { aplicarMontosEnvio } from './montosEnvio'
import { SHIPPING_COSTS } from '@/pages/checkout/checkoutHelpers'
import { COSTO_ENVIO, ENVIO } from '@/pages/checkout/paquetesCompra'
import { envioPorNegocio } from '@/pages/checkout/useCheckoutForm'

describe('montos de envío configurables (A-2)', () => {
  it('aplica los montos del ADMIN a las dos tablas del checkout', () => {
    aplicarMontosEnvio({ montoGamCrc: 3500, montoFueraGamCrc: 7000, montoRapidoCrc: 6500 })
    expect(SHIPPING_COSTS.ENVIO_NORMAL_FUERA_GAM).toBe(7000)
    expect(COSTO_ENVIO[ENVIO.NORMAL_GAM]).toBe(3500)
    expect(COSTO_ENVIO[ENVIO.RAPIDO]).toBe(6500)
    aplicarMontosEnvio({ montoGamCrc: 4000, montoFueraGamCrc: 5500, montoRapidoCrc: 5000 })
  })
  it('un envío por negocio aunque tenga dos bodegas (MED-3 b)', () => {
    const paquetes = [
      { bodegaId: '1', items: [{ empresaId: 7 }] },
      { bodegaId: '2', items: [{ empresaId: 7 }] },
      { bodegaId: '3', items: [{ empresaId: 9 }] },
    ]
    const metodos = { 1: 'ENVIO_NORMAL_GAM', 2: 'ENVIO_RAPIDO', 3: 'ENVIO_NORMAL_GAM' }
    expect(envioPorNegocio(paquetes, metodos)).toBe(5000 + 4000)
  })
})
