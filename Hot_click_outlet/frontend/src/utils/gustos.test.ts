import { beforeEach, describe, expect, it } from 'vitest'
import type { Producto } from '@/types/producto'
import {
  BOOST_CON_STOCK,
  BOOST_DESTACADO,
  BOOST_OFERTA,
  CHIP_BAND_SCORE,
  CHIP_CAT_SCORE,
  LIKE_BAND_DELTA,
  LIKE_CAT_DELTA,
  LIKE_MARCA_DELTA,
  LIKES_PARA_REVELAR,
  PENALTY_VISTO_RECIENTE,
  SWIPES_PARA_REVELAR,
  aplicarLikeProducto,
  debeRevelar,
  hasGustos,
  loadGustos,
  marcarProductoVisto,
  priceBand,
  rankScoreParaVos,
  type GustosScores,
} from './gustos'

const store = new Map<string, string>()
const memoryStorage: Storage = {
  get length() { return store.size },
  clear: () => store.clear(),
  getItem: (k) => store.get(k) ?? null,
  key: (i) => [...store.keys()][i] ?? null,
  removeItem: (k) => { store.delete(k) },
  setItem: (k, v) => { store.set(k, String(v)) },
}
Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage, configurable: true })

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

describe('aplicarLikeProducto', () => {
  beforeEach(() => {
    store.clear()
  })

  it('crea perfil e infiere categoría y banda de precio desde el primer like', () => {
    const producto = productoBase({ id: 11, categoriaId: 7, marcaId: 3, precio: 12000 })
    const perfil = aplicarLikeProducto(producto)

    expect(perfil.scores.get('c:7')).toBe(LIKE_CAT_DELTA)
    expect(perfil.scores.get('m:3')).toBe(LIKE_MARCA_DELTA)
    expect(perfil.scores.get(`b:${priceBand(12000)}`)).toBe(LIKE_BAND_DELTA)
    expect(perfil.selectedCategoryIds).toContain('7')
    expect(perfil.selectedPriceBands).toContain('b2')
    expect(perfil.seen['11']).toBeTruthy()
    expect(hasGustos(perfil)).toBe(true)
    expect(hasGustos(loadGustos())).toBe(true)
  })

  it('marca visto en skip sin cambiar scores', () => {
    aplicarLikeProducto(productoBase({ id: 1, categoriaId: 7, precio: 5000 }))
    const before = loadGustos()
    const after = marcarProductoVisto(99)
    expect(after.seen['99']).toBeTruthy()
    expect(after.scores.get('c:7')).toBe(before.scores.get('c:7'))
  })
})

describe('debeRevelar', () => {
  it('revela con 3 likes, 8 swipes o mazo vacío', () => {
    expect(debeRevelar(LIKES_PARA_REVELAR, 1, false)).toBe(true)
    expect(debeRevelar(0, SWIPES_PARA_REVELAR, false)).toBe(true)
    expect(debeRevelar(0, 0, true)).toBe(true)
    expect(debeRevelar(1, 2, false)).toBe(false)
  })
})
