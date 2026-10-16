import { describe, expect, it } from 'vitest'
import { TEXTOS_MULTINEGOCIO, nombrePlan } from './multinegocioTextos'

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
})
