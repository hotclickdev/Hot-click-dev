import { describe, expect, it } from 'vitest'
import { hrefCanonicalCatalogo } from './canonicalCatalogo'

describe('hrefCanonicalCatalogo', () => {
  it('apunta al sector cuando el filtro es solo esa categoría indexable', () => {
    expect(hrefCanonicalCatalogo(true, 'tecnologia', true)).toBe('https://hotclick.lat/comprar/tecnologia')
  })

  it('se queda en el catálogo si hay otros filtros o el sector no tiene landing', () => {
    expect(hrefCanonicalCatalogo(false, 'tecnologia', true)).toBe('https://hotclick.lat/productos')
    expect(hrefCanonicalCatalogo(true, 'tecnologia', false)).toBe('https://hotclick.lat/productos')
    expect(hrefCanonicalCatalogo(true, undefined, true)).toBe('https://hotclick.lat/productos')
  })
})
