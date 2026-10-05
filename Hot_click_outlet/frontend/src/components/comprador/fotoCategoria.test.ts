import { describe, expect, it } from 'vitest'
import { fotoCategoria } from './fotoCategoria'

describe('fotoCategoria', () => {
  it('pasa la foto de S3 por el proxy para poder filtrar el blanco', () => {
    const foto = fotoCategoria('https://hotclick-media.s3.us-east-2.amazonaws.com/productos/telegram/abc.jpg')
    expect(foto).toEqual({
      src: '/api/img?p=productos/telegram/abc.jpg&w=480&q=82',
      filtrable: true,
    })
  })

  it('deja Unsplash con CORS y no filtra un host desconocido', () => {
    expect(fotoCategoria('https://images.unsplash.com/photo-1?w=800').crossOrigin).toBe('anonymous')
    expect(fotoCategoria('https://cdn.ejemplo/foto.jpg').filtrable).toBe(false)
  })
})
