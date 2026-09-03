import { describe, expect, it } from 'vitest'
import { MSG_SOLO_GAM, ZONA_FUERA_GAM, ZONA_GAM, zonaPermitida } from './zonaLogistica'

describe('zonaPermitida', () => {
  it('acepta solo GAM', () => {
    expect(zonaPermitida(ZONA_GAM)).toBe(true)
    expect(zonaPermitida(ZONA_FUERA_GAM)).toBe(false)
    expect(MSG_SOLO_GAM).toMatch(/GAM/)
  })
})
