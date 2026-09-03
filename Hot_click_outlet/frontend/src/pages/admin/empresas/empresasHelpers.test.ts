import { describe, expect, it } from 'vitest'
import { ESTADOS, esProductoVisibleEnCatalogo, etiquetaPublicacionProducto } from './empresasHelpers'

describe('esProductoVisibleEnCatalogo', () => {
  it('trata undefined como visible', () => {
    expect(esProductoVisibleEnCatalogo(undefined)).toBe(true)
  })

  it('etiqueta Publicado o Pausado como en el emprendimiento', () => {
    expect(etiquetaPublicacionProducto(true)).toBe('Publicado')
    expect(etiquetaPublicacionProducto(false)).toBe('Pausado')
  })
})

describe('ESTADOS de tienda en admin', () => {
  it('solo permite los tres estados que el backend acepta', () => {
    expect(ESTADOS).toEqual(['ACTIVO', 'SUSPENDIDO', 'INACTIVO'])
  })
})
