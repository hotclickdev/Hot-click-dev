import { describe, expect, it } from 'vitest'
import { aEstadoUbicacionDespacho, debeAvisarFaltaUbicacion } from './ubicacionDespachoEstado'

describe('aEstadoUbicacionDespacho', () => {
  it('lee el ResponseDTO del backend', () => {
    const data = { success: true, data: { tieneUbicacion: false, obligatoria: true } }
    expect(aEstadoUbicacionDespacho(data)).toEqual({ tieneUbicacion: false, obligatoria: true })
  })

  it('acepta el objeto plano', () => {
    expect(aEstadoUbicacionDespacho({ tieneUbicacion: true, obligatoria: false }))
      .toEqual({ tieneUbicacion: true, obligatoria: false })
  })

  it('forma inesperada → asume que hay ubicación y no avisa', () => {
    expect(aEstadoUbicacionDespacho(null)).toEqual({ tieneUbicacion: true, obligatoria: false })
    expect(aEstadoUbicacionDespacho({ data: 'x' }).tieneUbicacion).toBe(true)
  })
})

describe('debeAvisarFaltaUbicacion', () => {
  it('avisa solo si el negocio no tiene ubicación', () => {
    expect(debeAvisarFaltaUbicacion({ tieneUbicacion: false, obligatoria: false })).toBe(true)
    expect(debeAvisarFaltaUbicacion({ tieneUbicacion: true, obligatoria: true })).toBe(false)
  })

  it('sin estado (cargando o error) no avisa', () => {
    expect(debeAvisarFaltaUbicacion(null)).toBe(false)
  })
})
