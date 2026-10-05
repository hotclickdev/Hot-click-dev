import { describe, expect, it } from 'vitest'
import { estaDisponible, subtotalRecuperado, unidadesPorAgregar } from './useCarritoRecuperado'
import type { ProductoRecuperado } from './useCarritoRecuperado'
import type { Producto } from '@/types/producto'

let siguienteClave = 0

function linea(cantidad: number, producto: Partial<Producto> | null): ProductoRecuperado {
  siguienteClave += 1
  return { clave: `linea-${siguienteClave}`, nombre: 'X', imagen: '', cantidad, producto: producto as Producto | null }
}

describe('carrito recuperado', () => {
  it('solo cuenta como disponible lo que existe y tiene stock', () => {
    expect(estaDisponible(linea(1, { precio: 100, stock: 3 }))).toBe(true)
    expect(estaDisponible(linea(1, { precio: 100, stock: 0 }))).toBe(false)
    expect(estaDisponible(linea(1, null))).toBe(false)
  })

  it('suma con el precio de hoy, topado al stock y sin lo agotado', () => {
    const lineas = [
      linea(2, { precio: 17500, stock: 12 }),
      linea(5, { precio: 1000, stock: 2 }),
      linea(1, { precio: 9000, stock: 0 }),
      linea(1, null),
    ]
    expect(subtotalRecuperado(lineas)).toBe(37000)
  })

  it('no duplica si el carrito ya tiene lo recuperado', () => {
    const recuperada = linea(3, { precio: 100, stock: 5 }) as ProductoRecuperado & { producto: Producto }
    expect(unidadesPorAgregar(recuperada, 0)).toBe(3)
    expect(unidadesPorAgregar(recuperada, 3)).toBe(0)
    expect(unidadesPorAgregar(recuperada, 1)).toBe(2)
    expect(unidadesPorAgregar(linea(9, { precio: 100, stock: 4 }) as typeof recuperada, 0)).toBe(4)
  })
})
