import { describe, expect, it } from 'vitest'
import { formatPrice } from '@/utils/format'
import { formatoColon, formatoMiles } from './formatoColon'

describe('formatoColon', () => {
  it('agrupa miles con punto como en el Figma', () => {
    expect(formatoColon(95900)).toBe('₡95.900')
    expect(formatoColon(4000)).toBe('₡4.000')
    expect(formatoColon(1250000)).toBe('₡1.250.000')
    expect(formatoColon(700)).toBe('₡700')
  })

  it('redondea y tolera valores vacíos', () => {
    expect(formatoMiles(2645.6)).toBe('2.646')
    expect(formatPrice(null)).toBe('₡0')
    expect(formatPrice('17500')).toBe('₡17.500')
  })
})
