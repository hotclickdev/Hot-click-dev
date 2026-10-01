import { describe, expect, it } from 'vitest'
import { etiquetaParecido, leerRespuestaFoto } from './busquedaFoto'

describe('leerRespuestaFoto', () => {
  it('toma etiquetas sin repetir y normaliza los productos', () => {
    const r = leerRespuestaFoto({
      analisis: { etiquetaPrincipal: 'Sillón', categoria: 'sillón' },
      productos: [{ id: 272, nombre: 'Sillón de sala verde', precio: 32000, imagenUrl: 'x.jpg', similarity: 91 }, { nombre: 'sin id' }],
      encontrado: true,
    })
    expect(r.etiquetas).toEqual(['Sillón'])
    expect(r.productos).toEqual([{ id: 272, nombre: 'Sillón de sala verde', precio: 32000, imagenUrl: 'x.jpg', similitud: 91, tienda: null, categoria: null }])
  })

  it('tolera una respuesta vacía o rara', () => {
    expect(leerRespuestaFoto(null)).toEqual({ categoriaDetectada: '', etiquetas: [], productos: [] })
  })
})

describe('etiquetaParecido', () => {
  const base = { id: 1, nombre: 'x', precio: 1, imagenUrl: null, tienda: null }
  it('muy parecido desde el umbral de similitud', () => {
    expect(etiquetaParecido({ ...base, similitud: 80, categoria: null }, 'Sillón')).toBe('muyParecido')
  })
  it('misma categoría si coincide con la detectada, relacionado si no', () => {
    expect(etiquetaParecido({ ...base, similitud: 60, categoria: 'sillón' }, 'Sillón')).toBe('mismaCategoria')
    expect(etiquetaParecido({ ...base, similitud: 60, categoria: 'Hogar' }, 'Sillón')).toBe('relacionado')
    expect(etiquetaParecido({ ...base, similitud: 60, categoria: null }, '')).toBe('relacionado')
  })
})
