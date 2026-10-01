import { describe, expect, it } from 'vitest'
import { enlacesCompartir, entradaDeRespuesta, listaEntradas, metaEntrada, minutosDeLectura, urlEntrada } from './blogHelpers'

describe('tiempo de lectura', () => {
  it('cuenta palabras del texto, no de las etiquetas', () => {
    const cuerpo = `<p>${'palabra '.repeat(400)}</p>`
    expect(minutosDeLectura(cuerpo)).toBe(2)
  })

  it('un artículo corto lee al menos un minuto y sin contenido no hay dato', () => {
    expect(minutosDeLectura('<p>Hola</p>')).toBe(1)
    expect(minutosDeLectura(undefined)).toBeNull()
    expect(minutosDeLectura('<p></p>')).toBeNull()
  })
})

describe('meta de una entrada', () => {
  it('fecha y lectura cuando hay contenido', () => {
    expect(metaEntrada({ fechaPublicacion: '2026-09-12', contenido: `<p>${'a '.repeat(800)}</p>` })).toBe('12 sep 2026 · 4 min de lectura')
  })

  it('solo fecha cuando el listado no trae contenido', () => {
    expect(metaEntrada({ fechaPublicacion: '2026-09-05' }, '')).toBe('5 sep 2026')
  })

  it('cae a la fecha de creación', () => {
    expect(metaEntrada({ fechaCreacion: '2026-08-28T10:00:00' }, '')).toBe('28 ago 2026')
  })
})

describe('enlaces', () => {
  it('usa el slug y, sin slug, el id', () => {
    expect(urlEntrada({ id: 3, slug: 'sofa' })).toBe('/blog/sofa')
    expect(urlEntrada({ id: 3 })).toBe('/blog/3')
  })

  it('arma los enlaces para compartir con el texto codificado', () => {
    const e = enlacesCompartir('https://hotclick.lat/blog/sofa', 'Cómo elegir un sofá')
    expect(e.whatsapp).toBe('https://wa.me/?text=C%C3%B3mo%20elegir%20un%20sof%C3%A1%20https%3A%2F%2Fhotclick.lat%2Fblog%2Fsofa')
    expect(e.facebook).toBe('https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fhotclick.lat%2Fblog%2Fsofa')
  })

  it('lee la lista de la respuesta y tolera formas inesperadas', () => {
    expect(listaEntradas({ data: [{ id: 1 }] })).toEqual([{ id: 1 }])
    expect(listaEntradas([{ id: 2 }])).toEqual([{ id: 2 }])
    expect(listaEntradas({ data: 'x' })).toEqual([])
    expect(listaEntradas(null)).toEqual([])
  })

  it('una entrada llega directa o dentro de data', () => {
    expect(entradaDeRespuesta({ id: 1, titulo: 'A' })).toEqual({ id: 1, titulo: 'A' })
    expect(entradaDeRespuesta({ data: { id: 2 } })).toEqual({ id: 2 })
    expect(entradaDeRespuesta({ data: null })).toBeNull()
    expect(entradaDeRespuesta([])).toBeNull()
  })
})
