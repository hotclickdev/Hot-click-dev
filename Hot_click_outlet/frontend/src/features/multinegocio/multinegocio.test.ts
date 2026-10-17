import { describe, expect, it } from 'vitest'
import { TEXTOS_MULTINEGOCIO, mensajeSinAcceso, nombrePlan } from './multinegocioTextos'

describe('S2 multinegocio', () => {
  it('usa el copy aprobado', () => {
    expect(TEXTOS_MULTINEGOCIO.elegirTitulo).toBe('Elegí tu negocio')
    expect(TEXTOS_MULTINEGOCIO.entraste('Tienda Sofi')).toBe('Entraste a Tienda Sofi.')
    expect(TEXTOS_MULTINEGOCIO.sinAccesoTitulo).toBe('No tenés acceso a este negocio')
  })

  it('muestra el plan solo si el backend lo manda (no se inventa)', () => {
    expect(nombrePlan('NEGOCIO_PLUS')).toBe('Negocio Plus')
    expect(nombrePlan(undefined)).toBeNull()
    expect(nombrePlan('OTRO')).toBeNull()
  })

  it('#201: 403 SIN_ACCESO_NEGOCIO muestra el estado sin acceso; otros errores no', () => {
    const e = { response: { status: 403, data: { success: false, code: 'SIN_ACCESO_NEGOCIO', message: 'No tenés acceso a ese negocio' } } }
    expect(mensajeSinAcceso(e)).toBe('No tenés acceso a este negocio. Ese emprendimiento no está en tu cuenta o no podés verlo.')
    expect(mensajeSinAcceso({ response: { status: 401 } })).toBeNull()
  })
})
