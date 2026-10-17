import { describe, expect, it } from 'vitest'
import { estadoEditor } from './editarProductoEstado'

describe('estadoEditor', () => {
  it('id que no está en el catálogo propio → 404', () => {
    expect(estadoEditor(false, null, false)).toBe('no-encontrado')
  })
  it('distingue carga, error de red y producto propio', () => {
    expect(estadoEditor(true, null, false)).toBe('cargando')
    expect(estadoEditor(false, 'No se pudo cargar el catálogo.', false)).toBe('error')
    expect(estadoEditor(false, null, true)).toBe('listo')
  })
})
