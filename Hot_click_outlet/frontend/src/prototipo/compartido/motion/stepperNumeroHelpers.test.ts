import { describe, expect, it } from 'vitest'
import { PASO_COLONES, ajustarEnteroString } from './stepperNumeroHelpers'

describe('ajustarEnteroString', () => {
  it('suma y resta el paso de colones', () => {
    expect(ajustarEnteroString('5000', PASO_COLONES)).toBe('5100')
    expect(ajustarEnteroString('5000', -PASO_COLONES)).toBe('4900')
  })

  it('trata vacío o inválido como 0', () => {
    expect(ajustarEnteroString('', PASO_COLONES)).toBe('100')
    expect(ajustarEnteroString('abc', -PASO_COLONES)).toBe('0')
  })

  it('no baja del mínimo', () => {
    expect(ajustarEnteroString('50', -PASO_COLONES)).toBe('0')
    expect(ajustarEnteroString('50', -PASO_COLONES, 1)).toBe('1')
  })
})
