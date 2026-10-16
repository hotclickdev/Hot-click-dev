import { describe, expect, it } from 'vitest'
import { ARMADO_FINAL_MS, finalArmado } from './pasosAntiDobleClic'

describe('finalArmado', () => {
  it('ignora el clic final que llega pegado al cambio de paso', () => {
    expect(finalArmado(1000, 1000 + 150)).toBe(false)
    expect(finalArmado(1000, 1000 + ARMADO_FINAL_MS)).toBe(true)
  })
})
