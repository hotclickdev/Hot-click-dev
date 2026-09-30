import { describe, expect, it } from 'vitest'
import { formatMiles, formatPrice } from './format'

describe('formatPrice', () => {
  it('usa punto de miles como en Figma', () => {
    expect(formatPrice(6200)).toBe('₡6.200')
    expect(formatPrice(22500)).toBe('₡22.500')
    expect(formatPrice(1234567)).toBe('₡1.234.567')
  })

  it('no agrupa por debajo de mil', () => {
    expect(formatPrice(0)).toBe('₡0')
    expect(formatPrice(999)).toBe('₡999')
  })

  it('tolera vacíos y texto numérico', () => {
    expect(formatPrice(null)).toBe('₡0')
    expect(formatPrice(undefined)).toBe('₡0')
    expect(formatPrice('12500')).toBe('₡12.500')
    expect(formatPrice('abc')).toBe('₡0')
  })

  it('redondea a colones enteros', () => {
    expect(formatPrice(1999.6)).toBe('₡2.000')
  })

  it('no deja espacios (ni NBSP) en el resultado', () => {
    expect(formatPrice(150000)).not.toMatch(/\s/)
    expect(formatMiles(4000)).toBe('4.000')
  })
})
