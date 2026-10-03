import { describe, expect, it } from 'vitest'
import { quedanPocos, STOCK_QUEDAN_MAX } from './stockEscaso'
import { STOCK_ESCASO_MAX } from '@/components/comprador/productCardHelpers'
import { STOCK_BAJO_MAX } from '@/pages/producto/productoHelpers'

describe('«Quedan N» · regla única', () => {
  it('el umbral es 5 en todos lados', () => {
    expect(STOCK_QUEDAN_MAX).toBe(5)
    expect(STOCK_ESCASO_MAX).toBe(5)
    expect(STOCK_BAJO_MAX).toBe(5)
  })
  it('1 a 5 son pocos; 0 y 6 no', () => {
    expect([0, 1, 5, 6, null].map(quedanPocos)).toEqual([false, true, true, false, false])
  })
})
