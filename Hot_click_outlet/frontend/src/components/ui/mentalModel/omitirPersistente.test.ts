import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Pyme: el tour reaparecía en cada pantalla tras «Omitir» (solo se marcaba la pantalla actual).
describe('MentalModelCoach Omitir', () => {
  it('Omitir apaga las guías de forma persistente', () => {
    const src = readFileSync(new URL('./MentalModelCoach.tsx', import.meta.url), 'utf8')
    const i = src.indexOf('setMmApagado(true)')
    expect(i).toBeGreaterThan(0)
    expect(src.slice(i, i + 400)).toContain('Omitir')
  })
})
