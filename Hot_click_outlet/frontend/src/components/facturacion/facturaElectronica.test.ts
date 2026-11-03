import { describe, expect, it } from 'vitest'
import i18n from '@/i18n'
import { cambiarFacturaElectronica, campoFactura, leerFacturaElectronica } from './facturaElectronica'

describe('M4: factura electrónica en checkout y POS', () => {
  it('sin marcar no manda la bandera (tiquete); marcada manda facturaElectronica: true', () => {
    expect(campoFactura(false)).toEqual({})
    expect(campoFactura(true)).toEqual({ facturaElectronica: true })
  })

  it('el estado del checkout arranca en tiquete y recuerda la marca', () => {
    expect(leerFacturaElectronica()).toBe(false)
    cambiarFacturaElectronica(true)
    expect(leerFacturaElectronica()).toBe(true)
    cambiarFacturaElectronica(false)
    expect(leerFacturaElectronica()).toBe(false)
  })

  it('el texto en español usa voseo y avisa del IVA', async () => {
    await i18n.changeLanguage('es')
    expect(i18n.t('facturaElectronica.checkout')).toBe('Quiero factura electrónica')
    expect(i18n.t('facturaElectronica.checkoutAyuda')).toMatch(/tus datos fiscales/)
    expect(i18n.t('facturaElectronica.checkoutAyuda')).toMatch(/IVA \(13 %\)/)
  })
})
