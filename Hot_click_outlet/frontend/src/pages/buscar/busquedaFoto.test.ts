import { describe, expect, it } from 'vitest'
import { leerRespuestaFoto } from './busquedaFoto'

describe('leerRespuestaFoto', () => {
  it('toma etiquetas sin repetir y normaliza los productos', () => {
    const r = leerRespuestaFoto({
      analisis: { etiquetaPrincipal: 'Sillón', categoria: 'sillón' },
      productos: [{ id: 272, nombre: 'Sillón de sala verde', precio: 32000, imagenUrl: 'x.jpg', similarity: 91 }, { nombre: 'sin id' }],
      encontrado: true,
    })
    expect(r.etiquetas).toEqual(['Sillón'])
    expect(r.productos).toEqual([{ id: 272, nombre: 'Sillón de sala verde', precio: 32000, imagenUrl: 'x.jpg', similitud: 91 }])
  })

  it('tolera una respuesta vacía o rara', () => {
    expect(leerRespuestaFoto(null)).toEqual({ etiquetas: [], productos: [] })
  })
})
