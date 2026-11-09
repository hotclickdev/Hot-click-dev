import { describe, expect, it } from 'vitest'
import { montoCobroVisible, montoPlanVisible } from './montoPlan'

describe('monto del cobro antes de confirmar', () => {
  it('muestra el USD que el backend mando en el cobro', () => {
    expect(montoCobroVisible({ montoUsd: 24 })).toBe('US$24/mes')
  })

  it('el catalogo tambien usa precioUsd y no los colones', () => {
    expect(montoPlanVisible({ precioUsd: 24 })).toBe('US$24/mes')
    expect(montoPlanVisible({ precioUsd: 0 })).toBeNull()
  })

  it('sin monto no inventa una cifra', () => {
    expect(montoCobroVisible(null)).toBeNull()
    expect(montoCobroVisible({})).toBeNull()
    expect(montoCobroVisible({ montoUsd: 0 })).toBeNull()
    expect(montoPlanVisible(null)).toBeNull()
  })
})
