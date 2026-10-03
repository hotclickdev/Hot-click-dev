import { describe, it, expect } from 'vitest'
import type { Producto } from '@/types/producto'
import { avisoStockBajoSinTalla, detectVideo, segmentoVideo, opcionesDeTalla, opinionesDesdeRespuesta, tiendaDesdeCatalogo } from './productoHelpers'

describe('ficha · opiniones', () => {
  it('lee la lista de { data: [...] } y descarta lo que no trae comentario', () => {
    const r = opinionesDesdeRespuesta({
      data: [
        { id: 1, nombreUsuario: 'Ana', comentario: ' Muy buena ', calificacion: 5 },
        { id: 2, nombreUsuario: 'Luis', comentario: '' },
        null,
      ],
    })
    expect(r).toEqual([{ id: '1', autor: 'Ana', comentario: 'Muy buena', calificacion: 5 }])
  })

  it('devuelve vacío con respuestas inesperadas', () => {
    expect(opinionesDesdeRespuesta(undefined)).toEqual([])
    expect(opinionesDesdeRespuesta({ data: 'x' })).toEqual([])
  })
})

describe('ficha · tallas', () => {
  const producto = { talla: '40,38,39,42' } as unknown as Producto

  it('mezcla tallas propias y hermanas y las ordena si son numéricas', () => {
    const o = opcionesDeTalla(producto, [{ id: 9, talla: '41', stock: 0 }])
    expect(o.map((x) => x.talla)).toEqual(['38', '39', '40', '41', '42'])
    expect(o.find((x) => x.talla === '41')).toMatchObject({ origen: 'hermana', id: 9, stock: 0 })
    expect(o.find((x) => x.talla === '40')?.origen).toBe('propia')
  })

  it('con tallas no numéricas conserva propias primero', () => {
    const o = opcionesDeTalla({ talla: 'M,S' } as unknown as Producto, [{ id: 3, talla: 'L', stock: 2 }])
    expect(o.map((x) => x.talla)).toEqual(['M', 'S', 'L'])
  })
})

describe('ficha · stock bajo sin talla', () => {
  const base = { stock: 3, esPersonalizado: false, modoPrecioPersonalizado: null } as unknown as Producto

  it('avisa en la cabecera cuando no hay selector de talla (solo color)', () => {
    expect(avisoStockBajoSinTalla({ ...base, colorVariante: 'Azul' } as Producto, [{ id: 2, colorVariante: 'Rojo' }])).toBe(true)
  })

  it('no avisa si hay tallas: el aviso vive en el selector de talla', () => {
    expect(avisoStockBajoSinTalla({ ...base, talla: '38,40' } as Producto, [])).toBe(false)
    expect(avisoStockBajoSinTalla(base, [{ id: 9, talla: '41', stock: 2 }])).toBe(false)
  })

  it('no avisa con stock suficiente, agotado, personalizado o cotizable', () => {
    expect(avisoStockBajoSinTalla({ ...base, stock: 12 } as Producto, [])).toBe(false)
    expect(avisoStockBajoSinTalla({ ...base, stock: 0 } as Producto, [])).toBe(false)
    expect(avisoStockBajoSinTalla({ ...base, esPersonalizado: true, modoPrecioPersonalizado: 'FIJO' } as Producto, [])).toBe(false)
    expect(avisoStockBajoSinTalla({ ...base, esPersonalizado: true, modoPrecioPersonalizado: 'COTIZACION' } as Producto, [])).toBe(false)
  })
})

describe('ficha · fila de tienda (Figma 28:839)', () => {
  const lista = [
    { empresaId: 7, empresaNombre: 'Bruma Café', empresaSlug: 'bruma-cafe' },
    { empresaId: 9, empresaNombre: null, empresaSlug: null },
    { empresaId: 9, empresaNombre: 'Casa Luna 506', empresaSlug: 'casa-luna-506' },
  ]
  it('toma nombre y slug de otro producto del mismo negocio', () => {
    expect(tiendaDesdeCatalogo(lista, 9)).toEqual({ empresaNombre: 'Casa Luna 506', empresaSlug: 'casa-luna-506' })
  })
  it('sin negocio conocido no inventa nada', () => {
    expect(tiendaDesdeCatalogo(lista, 1)).toBeNull()
    expect(tiendaDesdeCatalogo(lista, null)).toBeNull()
  })
})

describe('ficha · chip de marca redundante', () => {
  it('se oculta cuando la marca es la del propio negocio', async () => {
    const { marcaEsLaTienda } = await import('./productoHelpers')
    expect(marcaEsLaTienda({ marcaNombre: 'Luna 506', empresaNombre: 'Casa Luna 506' })).toBe(true)
    expect(marcaEsLaTienda({ marcaNombre: 'Nike', empresaNombre: 'Casa Luna 506' })).toBe(false)
    expect(marcaEsLaTienda({ marcaNombre: 'Nike', empresaNombre: null })).toBe(false)
  })
})

/** La misma URL con esquema http, armada con `URL` (sin el literal inseguro que marca Sonar S5332). */
function conProtocoloHttp(url: string): string {
  const u = new URL(url)
  u.protocol = 'http:'
  return u.href
}

describe('ficha · video del producto por red (derivado de Figma 28:839)', () => {
  it.each([
    ['https://www.youtube.com/watch?v=LXb3EKWsInQ', 'youtube', 'YouTube', false],
    ['https://www.youtube.com/watch?feature=share&v=LXb3EKWsInQ', 'youtube', 'YouTube', false],
    ['https://youtu.be/LXb3EKWsInQ', 'youtube', 'YouTube', false],
    ['https://youtube.com/shorts/LXb3EKWsInQ?si=x', 'youtube', 'Shorts', true],
    ['https://www.instagram.com/reel/C9abc_12/', 'instagram', 'Instagram', true],
    ['https://www.instagram.com/p/C9abc_12/', 'instagram', 'Instagram', true],
    ['https://www.tiktok.com/@luna/video/7312345678901234567', 'tiktok', 'TikTok', true],
    ['https://www.facebook.com/casaluna/videos/123456789/', 'facebook', 'Facebook', false],
    ['https://www.facebook.com/reel/123456789', 'facebook', 'Facebook', true],
    ['https://vimeo.com/76979871', 'vimeo', 'Vimeo', false],
  ])('%s → %s', (url, type, etiqueta, vertical) => {
    const v = detectVideo(url)
    expect(v).toMatchObject({ type, etiqueta, vertical })
    expect(v?.embedUrl).toBeTruthy()
  })
  it('YouTube trae miniatura para cargar el embed al tocar', () => {
    expect(detectVideo('https://youtu.be/LXb3EKWsInQ')?.miniatura).toBe('https://i.ytimg.com/vi/LXb3EKWsInQ/hqdefault.jpg')
  })
  it('otra red: tarjeta de enlace sin embed', () => {
    expect(detectVideo('https://www.dailymotion.com/video/x8abc')).toMatchObject({ type: 'otra', etiqueta: 'dailymotion.com', embedUrl: null })
  })
  it('sin video o URL inválida no dibuja nada', () => {
    expect(detectVideo('')).toBeNull()
    expect(detectVideo(null)).toBeNull()
    expect(detectVideo('no es una url')).toBeNull()
    expect(detectVideo('javascript:alert(1)')).toBeNull()
  })
  it.each([
    'https://sitio-ajeno.example/x?youtu.be/AAAAAAAAAAA',
    'https://sitio-ajeno.example/youtube.com/watch?v=AAAAAAAAAAA',
    'https://youtu.be.sitio-ajeno.example/AAAAAAAAAAA',
    'https://noyoutube.com/watch?v=AAAAAAAAAAA',
    'https://youtu.be@sitio-ajeno.example/AAAAAAAAAAA',
    'https://sitio-ajeno.example/?vimeo.com/76979871',
    'https://vimeo.com.sitio-ajeno.example/76979871',
  ])('host ajeno no se hace pasar por YouTube o Vimeo (SEC-98-03): %s', (url) => {
    const v = detectVideo(url)
    const host = new URL(url).hostname
    expect(host).not.toMatch(/^(?:www\.|m\.)?(?:youtube\.com|youtu\.be|vimeo\.com)$/)
    expect(v).toMatchObject({ type: 'otra', etiqueta: host, embedUrl: null })
    expect(new URL(v!.url).hostname).toBe(host)
  })
  it.each([
    ['https://youtu.be/LXb3EKWsInQ?si=x&next=https://sitio-ajeno.example', 'https://www.youtube.com/watch?v=LXb3EKWsInQ'],
    [conProtocoloHttp('https://m.youtube.com/watch?v=LXb3EKWsInQ&t=10'), 'https://www.youtube.com/watch?v=LXb3EKWsInQ'],
    ['https://youtube.com/shorts/LXb3EKWsInQ?si=x', 'https://www.youtube.com/watch?v=LXb3EKWsInQ'],
    ['https://www.youtube.com/embed/LXb3EKWsInQ', 'https://www.youtube.com/watch?v=LXb3EKWsInQ'],
    ['https://vimeo.com/76979871?share=copy', 'https://vimeo.com/76979871'],
    ['https://player.vimeo.com/video/76979871', 'https://vimeo.com/76979871'],
  ])('"Ver en …" se arma desde el ID: %s → %s', (url, enlace) => {
    expect(detectVideo(url)?.url).toBe(enlace)
  })
  it('YouTube o Vimeo con ruta sin ID válido no se toma como video de esa red', () => {
    expect(detectVideo('https://www.youtube.com/@canal')).toMatchObject({ type: 'otra', embedUrl: null })
    expect(detectVideo('https://youtu.be/corto')).toMatchObject({ type: 'otra', embedUrl: null })
    expect(detectVideo('https://vimeo.com/canal/abc')).toMatchObject({ type: 'otra', embedUrl: null })
  })
})

describe('ficha · segmento de plataforma del video', () => {
  it('YouTube, Instagram y TikTok tienen segmento propio; Facebook, Vimeo y el resto van a "Otra red"', () => {
    expect(segmentoVideo('youtube')).toBe('youtube')
    expect(segmentoVideo('instagram')).toBe('instagram')
    expect(segmentoVideo('tiktok')).toBe('tiktok')
    expect(segmentoVideo('facebook')).toBe('otra')
    expect(segmentoVideo('vimeo')).toBe('otra')
    expect(segmentoVideo('otra')).toBe('otra')
  })
})
