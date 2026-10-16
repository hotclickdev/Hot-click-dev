import { describe, expect, it } from 'vitest'
import { muestraAccesoCuentaExistente } from './AccesoCuentaExistente'

describe('AccesoCuentaExistente', () => {
  it('aparece con el mensaje genérico del alta', () => {
    expect(muestraAccesoCuentaExistente('No pudimos completar el registro. ¿Ya tenés cuenta? Iniciá sesión o recuperá tu contraseña')).toBe(true)
  })
  it('no aparece con otros errores ni sin error', () => {
    expect(muestraAccesoCuentaExistente('El correo es requerido')).toBe(false)
    expect(muestraAccesoCuentaExistente('')).toBe(false)
    expect(muestraAccesoCuentaExistente(null)).toBe(false)
  })
})
