import { describe, expect, it } from 'vitest'
import { coincideBusqueda, normalizarBusqueda } from './catalogoFiltros'

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
})
