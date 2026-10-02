import { describe, expect, it } from 'vitest'
import { inicialesNegocio } from './qrNegocioHelpers'

describe('inicialesNegocio', () => {
  it('toma hasta dos iniciales en mayúscula', () => {
    expect(inicialesNegocio('Bruma Café')).toBe('BC')
    expect(inicialesNegocio('bruma café del centro')).toBe('BC')
    expect(inicialesNegocio('Caja')).toBe('C')
  })

  it('devuelve ? si no hay nombre', () => {
    expect(inicialesNegocio('   ')).toBe('?')
    expect(inicialesNegocio('')).toBe('?')
  })
})
