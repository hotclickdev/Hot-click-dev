import { describe, expect, it } from 'vitest'
import { filtrarCategorias } from './categoriasFiltro'

const cats = [
  { id: 1, nombre: 'Tecnología', cantidad: 5, fotoUrl: null },
  { id: 2, nombre: 'Hogar', cantidad: 5, fotoUrl: null },
]

describe('filtrarCategorias', () => {
  it('encuentra sin acentos ni mayúsculas', () => {
    expect(filtrarCategorias(cats, 'TECNOLOGIA').map((c) => c.id)).toEqual([1])
  })
  it('sin texto devuelve todas', () => {
    expect(filtrarCategorias(cats, '  ')).toBe(cats)
  })
})
