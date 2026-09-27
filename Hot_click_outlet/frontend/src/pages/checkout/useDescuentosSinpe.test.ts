import { describe, expect, it } from 'vitest'
import { parseDescuentosSinpe } from './useDescuentosSinpe'

describe('parseDescuentosSinpe', () => {
  it('convierte las claves a número y descarta valores inválidos o en cero', () => {
    expect(parseDescuentosSinpe({ 7: 5, 8: '2.5', 9: 0, x: 3, 10: 'abc' })).toEqual({ 7: 5, 8: 2.5 })
  })

  it('tolera respuestas vacías', () => {
    expect(parseDescuentosSinpe(null)).toEqual({})
    expect(parseDescuentosSinpe('texto')).toEqual({})
  })
})
