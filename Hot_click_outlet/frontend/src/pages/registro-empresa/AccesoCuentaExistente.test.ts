import { describe, expect, it } from 'vitest'
import { muestraAccesoCuentaExistente } from './accesoCuentaExistente'

describe('AccesoCuentaExistente', () => {
  it('aparece solo con «Ese correo ya está registrado.»', () => {
    expect(muestraAccesoCuentaExistente('Ese correo ya está registrado.')).toBe(true)
  })
  it('no aparece con el genérico de cédula, otros errores ni sin error', () => {
    expect(muestraAccesoCuentaExistente('No pudimos completar el registro; si ya tenés cuenta, iniciá sesión o recuperá el acceso')).toBe(false)
    expect(muestraAccesoCuentaExistente('El correo es requerido')).toBe(false)
    expect(muestraAccesoCuentaExistente('')).toBe(false)
    expect(muestraAccesoCuentaExistente(null)).toBe(false)
  })
})
