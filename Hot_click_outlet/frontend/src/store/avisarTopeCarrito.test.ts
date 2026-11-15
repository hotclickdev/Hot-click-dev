import { describe, expect, it, vi } from 'vitest'
import { MENSAJE_MAX_LINEAS_CARRITO } from './cartStore'
import { avisarSiTopeCarrito } from './avisarTopeCarrito'

describe('avisarSiTopeCarrito', () => {
  it('no avisa y devuelve true si addItem aceptó la línea', () => {
    const avisar = vi.fn()
    expect(avisarSiTopeCarrito(true, avisar)).toBe(true)
    expect(avisar).not.toHaveBeenCalled()
  })

  it('muestra MENSAJE_MAX_LINEAS_CARRITO y devuelve false si el tope rechazó la línea', () => {
    const avisar = vi.fn()
    expect(avisarSiTopeCarrito(false, avisar)).toBe(false)
    expect(avisar).toHaveBeenCalledOnce()
    expect(avisar).toHaveBeenCalledWith(MENSAJE_MAX_LINEAS_CARRITO)
  })
})
