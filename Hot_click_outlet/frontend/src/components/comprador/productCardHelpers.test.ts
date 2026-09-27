import { describe, expect, it } from 'vitest'
import { fotoProducto, nombreVendedor, stockEscaso } from './productCardHelpers'

describe('tarjeta de producto del comprador', () => {
  it('muestra “Quedan N” solo con stock bajo y disponible', () => {
    expect(stockEscaso({ stock: 4 })).toBe(4)
    expect(stockEscaso({ stock: 5 })).toBe(5)
    expect(stockEscaso({ stock: 6 })).toBeNull()
    expect(stockEscaso({ stock: 0 })).toBeNull()
  })

  it('usa el nombre del negocio y cae a la bodega', () => {
    expect(nombreVendedor({ empresaNombre: 'Casa Luna 506', bodegaNombre: 'Central' })).toBe('Casa Luna 506')
    expect(nombreVendedor({ empresaNombre: '  ', bodegaNombre: 'Taller Ceiba' })).toBe('Taller Ceiba')
    expect(nombreVendedor({})).toBe('HotClick')
  })

  it('elige la foto disponible', () => {
    expect(fotoProducto({ imagenUrl: 'a.jpg', imagenPrincipalUrl: 'b.jpg' })).toBe('a.jpg')
    expect(fotoProducto({ imagenPrincipalUrl: 'b.jpg' })).toBe('b.jpg')
    expect(fotoProducto({})).toBeNull()
  })
})
