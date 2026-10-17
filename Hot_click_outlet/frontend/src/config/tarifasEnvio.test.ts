import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { costoDeEnvio, normalizarTarifas } from './tarifasEnvio'

describe('tarifas de envío del servidor (QA-COM-006)', () => {
  it('lee solo números válidos y da 0 a lo que no tiene tarifa', () => {
    const t = normalizarTarifas({ ENVIO_NORMAL_GAM: 4000, RARO: 'x', NEG: -1 })
    expect(costoDeEnvio(t, 'ENVIO_NORMAL_GAM')).toBe(4000)
    expect(costoDeEnvio(t, 'RARO')).toBe(0)
    expect(costoDeEnvio(t, 'NEG')).toBe(0)
    expect(costoDeEnvio(t, undefined)).toBe(0)
    expect(normalizarTarifas(null)).toEqual({})
  })

  it('el frontend ya no guarda su copia de la tabla', () => {
    const helpers = readFileSync(new URL('../pages/checkout/checkoutHelpers.ts', import.meta.url), 'utf8')
    expect(helpers).not.toMatch(/SHIPPING_COSTS|ENVIO_NORMAL_GAM\s*:/)
  })
})
