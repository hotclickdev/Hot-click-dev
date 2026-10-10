import { describe, expect, it } from 'vitest'
import { formularioProductoSucio } from './formularioProductoSucio'

describe('formularioProductoSucio', () => {
  it('queda limpio si no hay texto', () => {
    expect(formularioProductoSucio({})).toBe(false)
    expect(formularioProductoSucio({ nombre: '  ' })).toBe(false)
  })

  it('marca sucio con foto o nombre', () => {
    expect(formularioProductoSucio({ imagenUrl: 'https://x/a.jpg' })).toBe(true)
    expect(formularioProductoSucio({ nombre: 'Camiseta' })).toBe(true)
  })
})
