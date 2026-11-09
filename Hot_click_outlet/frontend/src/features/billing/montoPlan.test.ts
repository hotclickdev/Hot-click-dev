import { describe, expect, it } from 'vitest'
import { montoPlanVisible } from './montoPlan'

describe('monto del plan antes de confirmar', () => {
  it('muestra el USD que manda el backend', () => {
    expect(montoPlanVisible({ precioUsd: 24, precioMensual: 12000 })).toBe('US$24/mes')
  })

  it('sin USD usa los colones del plan', () => {
    expect(montoPlanVisible({ precioMensual: 9900 })).toBe('₡9.900/mes')
  })

  it('sin monto no inventa una cifra', () => {
    expect(montoPlanVisible(null)).toBeNull()
    expect(montoPlanVisible({ precioUsd: 0, precioMensual: 0 })).toBeNull()
    expect(montoPlanVisible({})).toBeNull()
  })
})
