import { describe, expect, it } from 'vitest'
import { PASO_RANGO, topeDeRango } from './rangoPrecioHelpers'

describe('topeDeRango', () => {
  it('redondea el precio más alto hacia arriba al salto', () => {
    expect(topeDeRango([17500, 32000, 22500])).toBe(32000)
    expect(topeDeRango([1200, 999])).toBe(1500)
    expect(PASO_RANGO).toBe(500)
  })
  it('sin productos no hay rango', () => {
    expect(topeDeRango([])).toBe(0)
  })
})
