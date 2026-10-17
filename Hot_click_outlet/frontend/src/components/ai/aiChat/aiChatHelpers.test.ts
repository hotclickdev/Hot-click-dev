import { describe, expect, it } from 'vitest'
import { normalizeProduct } from './aiChatHelpers'

describe('asistente: vendedor del producto', () => {
  it('trae nombre del negocio y slug para /tienda/<slug>', () => {
    const p = normalizeProduct({ id: 1, nombre: 'Taza', empresaNombre: 'Café Sol', empresaSlug: 'cafe-sol' })
    expect(p.empresaNombre).toBe('Café Sol')
    expect(p.empresaSlug).toBe('cafe-sol')
  })

  it('sin negocio público no hay enlace', () => {
    expect(normalizeProduct({ id: 2, nombre: 'Vaso' }).empresaSlug).toBeNull()
  })
})
