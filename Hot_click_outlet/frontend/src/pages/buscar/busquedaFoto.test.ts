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

  it('lee la tienda y la categoría que manda search-by-image (P11)', () => {
    const r = leerRespuestaFoto({
      analisis: { etiquetaPrincipal: 'Silla', categoria: 'Muebles' },
      productos: [{ id: 10, nombre: 'Silla', precio: 5000, imagenUrl: null, similarity: 74, empresaNombre: 'Casa Luna', categoria: 'Muebles' }],
      encontrado: true,
    })
    expect(r.productos[0]).toMatchObject({ tienda: 'Casa Luna', categoria: 'Muebles' })
    expect(etiquetaParecido(r.productos[0], r.categoriaDetectada)).toBe('mismaCategoria')
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

describe('validarFoto (mismas reglas que search-by-image)', () => {
  it('acepta JPG, PNG, WebP y GIF de hasta 5 MB', async () => {
    const { validarFoto, FOTO_MAX_BYTES } = await import('./busquedaFoto')
    expect(validarFoto({ type: 'image/jpeg', size: 1000 })).toBe('ok')
    expect(validarFoto({ type: 'image/png', size: FOTO_MAX_BYTES })).toBe('ok')
    expect(validarFoto({ type: 'image/webp', size: 10 })).toBe('ok')
    expect(validarFoto({ type: 'image/gif', size: 10 })).toBe('ok')
  })

  it('rechaza otros formatos y fotos de más de 5 MB', async () => {
    const { validarFoto, FOTO_MAX_BYTES } = await import('./busquedaFoto')
    expect(validarFoto({ type: 'image/heic', size: 10 })).toBe('formato')
    expect(validarFoto({ type: 'application/pdf', size: 10 })).toBe('formato')
    expect(validarFoto({ type: '', size: 10 })).toBe('formato')
    expect(validarFoto({ type: 'image/jpeg', size: FOTO_MAX_BYTES + 1 })).toBe('pesada')
  })
})
