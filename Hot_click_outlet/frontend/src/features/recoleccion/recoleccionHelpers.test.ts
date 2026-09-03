import { describe, expect, it } from 'vitest'
import { formatoTarifa, listaRecolecciones } from './recoleccionHelpers'

describe('listaRecolecciones', () => {
  it('acepta array o envelope', () => {
    expect(listaRecolecciones([{ id: 1 }])).toHaveLength(1)
    expect(listaRecolecciones({ data: [{ id: 2 }] })).toHaveLength(1)
    expect(listaRecolecciones(null)).toEqual([])
  })
})

describe('formatoTarifa', () => {
  it('pendiente si no hay monto', () => {
    expect(formatoTarifa(null)).toBe('Pendiente')
  })
})
