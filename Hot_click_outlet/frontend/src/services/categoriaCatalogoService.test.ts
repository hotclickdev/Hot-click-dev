import { describe, expect, it } from 'vitest'
import { leerCategoriasConProductos } from './categoriaCatalogoService'

describe('leerCategoriasConProductos', () => {
  it('conserva las filas válidas y normaliza la foto', () => {
    const filas = leerCategoriasConProductos([
      { id: 3, nombre: 'Hogar', cantidad: 12, fotoUrl: 'hogar.jpg' },
      { id: 4, nombre: 'Mascotas', cantidad: 2 },
    ])
    expect(filas).toEqual([
      { id: 3, nombre: 'Hogar', cantidad: 12, fotoUrl: 'hogar.jpg' },
      { id: 4, nombre: 'Mascotas', cantidad: 2, fotoUrl: null },
    ])
  })

  it('descarta respuestas que no son lista y filas incompletas', () => {
    expect(leerCategoriasConProductos({ content: [] })).toEqual([])
    expect(leerCategoriasConProductos([{ id: '1', nombre: 'X', cantidad: 1 }, null])).toEqual([])
  })
})
