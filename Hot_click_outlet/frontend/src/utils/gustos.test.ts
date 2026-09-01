import { describe, expect, it } from 'vitest'
import type { Producto } from '@/types/producto'
import {
  BOOST_CON_STOCK,
  BOOST_DESTACADO,
  BOOST_OFERTA,
  CHIP_BAND_SCORE,
  CHIP_CAT_SCORE,
  PENALTY_VISTO_RECIENTE,
  rankScoreParaVos,
  type GustosScores,
} from './gustos'

function productoBase(overrides: Partial<Producto> = {}): Producto {
  return {
    id: 1,
    nombre: 'Producto test',
    precio: 5000,
    categoriaId: 7,
    marcaId: 2,
    stock: 10,
    destacado: false,
    enOferta: false,
    imagenUrl: 'https://example.com/img.jpg',
    ...overrides,
  } as Producto
}

describe('rankScoreParaVos', () => {
  it('combina afinidad de chips con boosts de merchandising', () => {
    const scores: GustosScores = new Map([
      ['c:7', CHIP_CAT_SCORE],
      ['b:b1', CHIP_BAND_SCORE],
    ])
    const producto = productoBase({ destacado: true, enOferta: true, stock: 5 })
    const esperado =
      CHIP_CAT_SCORE +
      CHIP_BAND_SCORE +
      BOOST_DESTACADO +
      BOOST_OFERTA +
      BOOST_CON_STOCK

    expect(rankScoreParaVos(producto, scores, new Set())).toBe(esperado)
  })

  it('penaliza productos vistos recientemente', () => {
    const scores: GustosScores = new Map()
    const producto = productoBase({ id: 42 })
    const sinVista = rankScoreParaVos(producto, scores, new Set())
    const conVista = rankScoreParaVos(producto, scores, new Set(['42']))

    expect(conVista).toBe(sinVista - PENALTY_VISTO_RECIENTE)
  })

  it('ordena mejor el producto con mayor afinidad de categoría', () => {
    const scores: GustosScores = new Map([['c:7', CHIP_CAT_SCORE]])
    const coincide = productoBase({ categoriaId: 7 })
    const otro = productoBase({ categoriaId: 99, id: 2 })

    expect(rankScoreParaVos(coincide, scores, new Set())).toBeGreaterThan(
      rankScoreParaVos(otro, scores, new Set()),
    )
  })
})
