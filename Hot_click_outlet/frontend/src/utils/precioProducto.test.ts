import { describe, expect, it } from 'vitest'
import { esProductoCotizable, textoPrecioProducto } from './precioProducto'

describe('textoPrecioProducto', () => {
  it('muestra A cotizar en vez del placeholder ₡1', () => {
    expect(textoPrecioProducto({
      esPersonalizado: true,
      modoPrecioPersonalizado: 'COTIZACION',
      precio: 1,
    })).toBe('A cotizar')
  })

  it('FIJO y catálogo usan el precio', () => {
    expect(textoPrecioProducto({ esPersonalizado: true, modoPrecioPersonalizado: 'FIJO', precio: 12000 }))
      .toMatch(/12/)
    expect(esProductoCotizable({ esPersonalizado: true, modoPrecioPersonalizado: 'COTIZACION' })).toBe(true)
    expect(esProductoCotizable({ esPersonalizado: true, modoPrecioPersonalizado: 'FIJO' })).toBe(false)
  })
})
