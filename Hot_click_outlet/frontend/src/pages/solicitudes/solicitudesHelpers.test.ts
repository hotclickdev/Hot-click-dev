import { describe, expect, it } from 'vitest'
import { claveLinea, estadoVisual, fechaHora, fotosDeSolicitud, solicitudPorId } from './solicitudesHelpers'

describe('estado visible de una solicitud', () => {
  it('agrupa los estados del backend en cotizada, en búsqueda y cerrada', () => {
    expect(estadoVisual('ENCONTRADO')).toBe('cotizada')
    expect(estadoVisual('EN_BUSQUEDA')).toBe('enBusqueda')
    expect(estadoVisual('PENDIENTE')).toBe('enBusqueda')
    expect(estadoVisual('NO_ENCONTRADO')).toBe('cerrada')
    expect(estadoVisual('CANCELADO')).toBe('cerrada')
    expect(estadoVisual(undefined)).toBe('enBusqueda')
  })

  it('la tercera línea de la tarjeta depende del estado', () => {
    expect(claveLinea('EN_BUSQUEDA')).toBe('solicitudes.lineas.enBusqueda')
    expect(claveLinea('NO_ENCONTRADO')).toBe('solicitudes.lineas.noEncontrado')
    expect(claveLinea('PENDIENTE')).toBe('solicitudes.lineas.pendiente')
  })
})

describe('fotos de la solicitud', () => {
  it('lee el arreglo JSON de URLs y descarta lo que no es texto', () => {
    expect(fotosDeSolicitud('["https://a/1.jpg","https://a/2.jpg"]')).toEqual(['https://a/1.jpg', 'https://a/2.jpg'])
    expect(fotosDeSolicitud('["https://a/1.jpg", 5]')).toEqual(['https://a/1.jpg'])
  })

  it('acepta una URL suelta de solicitudes antiguas y rechaza basura', () => {
    expect(fotosDeSolicitud('https://a/viejo.jpg')).toEqual(['https://a/viejo.jpg'])
    expect(fotosDeSolicitud('no es url')).toEqual([])
    expect(fotosDeSolicitud(null)).toEqual([])
  })
})

describe('búsqueda y hora', () => {
  it('encuentra la solicitud por id aunque el id sea número', () => {
    expect(solicitudPorId([{ id: 31 }, { id: 30 }], '30')?.id).toBe(30)
    expect(solicitudPorId([{ id: 31 }], null)).toBeNull()
  })

  it('agrega la hora al historial', () => {
    expect(fechaHora('2026-09-23T15:47:00', '23 de set.')).toBe('23 de set. · 15:47')
    expect(fechaHora(undefined, '23 de set.')).toBe('23 de set.')
  })
})
