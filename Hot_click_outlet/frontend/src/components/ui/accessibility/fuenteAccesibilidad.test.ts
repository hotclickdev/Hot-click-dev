import { describe, expect, it } from 'vitest'
import { chipFuenteActivo, fuenteAlElegirMayor, fuenteAlElegirMenor } from './fuenteAccesibilidad'

describe('chipFuenteActivo', () => {
  it('el default normal marca A, no A−', () => {
    expect(chipFuenteActivo('normal')).toBe('media')
  })

  it('lg y xl marcan A+ sin rebajar xl', () => {
    expect(chipFuenteActivo('lg')).toBe('mayor')
    expect(chipFuenteActivo('xl')).toBe('mayor')
    expect(fuenteAlElegirMayor('normal')).toBe('lg')
    expect(fuenteAlElegirMayor('xl')).toBe('xl')
  })

  it('A− guarda sm (87,5 %) y marca su chip', () => {
    expect(fuenteAlElegirMenor()).toBe('sm')
    expect(chipFuenteActivo('sm')).toBe('menor')
  })
})
