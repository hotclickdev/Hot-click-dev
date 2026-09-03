import { describe, expect, it } from 'vitest'
import { esProductoVisibleEnCatalogo, etiquetaPublicacionProducto } from './empresasHelpers'

describe('esProductoVisibleEnCatalogo', () => {
  it('trata undefined como visible', () => {
    expect(esProductoVisibleEnCatalogo(undefined)).toBe(true)
  })

  it('etiqueta Publicado o Pausado como en el emprendimiento', () => {
    expect(etiquetaPublicacionProducto(true)).toBe('Publicado')
    expect(etiquetaPublicacionProducto(false)).toBe('Pausado')
  })
})
