import { describe, expect, it } from 'vitest'
import type { Producto } from '@/types/producto'
import { conStock, elegirDestacados, elegirNuevos } from './homeCompraHelpers'

const p = (id: number, stock = 5, fechaCreacion?: string) =>
  ({ id, nombre: `P${id}`, stock, fechaCreacion } as unknown as Producto)

describe('conStock', () => {
  it('descarta agotados y sin stock informado', () => {
    expect(conStock([p(1, 0), p(2, 3), { id: 3 } as Producto]).map((x) => x.id)).toEqual([2])
  })
})

describe('elegirDestacados', () => {
  it('usa los destacados con stock hasta el máximo', () => {
    expect(elegirDestacados([p(1), p(2), p(3, 0), p(4), p(5), p(6)], [], 4).map((x) => x.id)).toEqual([1, 2, 4, 5])
  })

  it('completa con el catálogo sin repetir cuando hay pocos destacados', () => {
    expect(elegirDestacados([p(1)], [p(1), p(7), p(8, 0), p(9)], 3).map((x) => x.id)).toEqual([1, 7, 9])
  })
})

describe('elegirNuevos', () => {
  it('excluye destacados, agotados y ordena del más reciente al más viejo', () => {
    const catalogo = [p(1, 5, '2026-09-01'), p(2, 5, '2026-09-20'), p(3, 0, '2026-09-25'), p(4, 5, '2026-09-10'), p(5, 5)]
    expect(elegirNuevos(catalogo, [p(4)], 3).map((x) => x.id)).toEqual([2, 1, 5])
  })
})
