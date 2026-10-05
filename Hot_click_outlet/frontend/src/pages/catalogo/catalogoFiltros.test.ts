import { describe, expect, it } from 'vitest'
import type { Producto } from '@/types/producto'
import { coincideBusqueda, normalizarBusqueda, sortCatalogo } from './catalogoFiltros'

describe('búsqueda del catálogo sin tildes (Figma 26:722)', () => {
  it('normaliza tildes y mayúsculas', () => {
    expect(normalizarBusqueda('  Sofá ')).toBe('sofa')
  })
  it('"sofa" encuentra "Sofá de sala"', () => {
    expect(coincideBusqueda({ nombre: 'Sofá de sala dos plazas', marcaNombre: '', empresaNombre: null }, 'sofa')).toBe(true)
  })
  it('busca también por tienda y marca', () => {
    expect(coincideBusqueda({ nombre: 'Taza', marcaNombre: 'Luna', empresaNombre: 'Casa Luna 506' }, 'casa luna')).toBe(true)
    expect(coincideBusqueda({ nombre: 'Taza', marcaNombre: 'Lúna', empresaNombre: null }, 'luna')).toBe(true)
  })
  it('sin coincidencia y búsqueda vacía', () => {
    expect(coincideBusqueda({ nombre: 'Taza', marcaNombre: '', empresaNombre: null }, 'qqzzxx')).toBe(false)
    expect(coincideBusqueda({ nombre: 'Taza', marcaNombre: '', empresaNombre: null }, '  ')).toBe(true)
  })
  it('filtra por palabras: alcanza con que una esté en el producto', () => {
    expect(coincideBusqueda({ nombre: 'Taza personalizada', marcaNombre: '', empresaNombre: null }, 'regalo para mi mamá taza')).toBe(true)
    expect(coincideBusqueda({ nombre: 'Taza personalizada', marcaNombre: '', empresaNombre: null }, 'sds')).toBe(false)
  })
  it('categoría y descripción cuentan, y una palabra corta no entra dentro de otra', () => {
    expect(coincideBusqueda({
      nombre: 'Taza personalizada con nombre y color', marcaNombre: '', empresaNombre: 'Casa Luna 506',
      categoriaNombre: 'Regalos', descripcion: 'Regalo para mamá',
    }, 'regalo para mi mamá')).toBe(true)
    expect(coincideBusqueda({ nombre: 'Radiador', marcaNombre: '', empresaNombre: null }, 'día')).toBe(false)
    expect(coincideBusqueda({ nombre: 'Diario de viaje', marcaNombre: '', empresaNombre: null }, 'día')).toBe(false)
    expect(coincideBusqueda({ nombre: 'Crema de día', marcaNombre: '', empresaNombre: null }, 'día')).toBe(true)
  })
})

describe('orden del catálogo con búsqueda', () => {
  const item = (id: number, nombre: string, precio: number, extra: Partial<Producto> = {}): Producto =>
    ({ id, nombre, precio, stock: 4, marcaNombre: '', empresaNombre: null, ...extra }) as Producto

  it('el orden por defecto pone primero el que coincide en más palabras', () => {
    const taza = item(1, 'Taza personalizada', 1000)
    const regalo = item(2, 'Regalo para mamá', 9000, { categoriaNombre: 'Regalos' })
    const orden = sortCatalogo([taza, regalo], 'default', null, () => 0, 'regalo para mi mamá taza')
    expect(orden.map((producto) => producto.id)).toEqual([2, 1])
  })

  it('si el visitante pide precio, el precio manda', () => {
    const taza = item(1, 'Taza personalizada', 1000)
    const regalo = item(2, 'Regalo para mamá', 9000, { categoriaNombre: 'Regalos' })
    const orden = sortCatalogo([regalo, taza], 'price_asc', null, () => 0, 'regalo para mi mamá taza')
    expect(orden.map((producto) => producto.id)).toEqual([1, 2])
  })
})
