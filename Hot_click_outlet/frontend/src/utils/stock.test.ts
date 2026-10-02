import { describe, expect, it } from 'vitest'
import { STOCK_DESCONOCIDO, topeStock } from './stock'

describe('topeStock (R4)', () => {
  it('usa el stock real cuando se conoce, incluido 0', () => {
    expect(topeStock(3)).toBe(3)
    expect(topeStock(0)).toBe(0)
  })

  it('99 solo cuando el stock no se conoce', () => {
    expect(topeStock(undefined)).toBe(STOCK_DESCONOCIDO)
    expect(topeStock(null)).toBe(99)
  })
})
