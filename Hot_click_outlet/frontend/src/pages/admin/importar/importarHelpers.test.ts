import { describe, expect, it } from 'vitest'
import {
  agruparProductosPorCategoria,
  chipsCategoriaImportar,
  filtrarProductosPorChip,
  fuenteDesdeParam,
  nombreCategoriaImportar,
  type CategoriaImportar,
  type ProductoImportado,
} from './importarHelpers'

function producto(partial: Partial<ProductoImportado> & Pick<ProductoImportado, '_id'>): ProductoImportado {
  return {
    _sel: true,
    nombreProducto: `Producto ${partial._id}`,
    ...partial,
  }
}

const categorias: CategoriaImportar[] = [
  { id: 10, nombreCategoria: 'Electrónica' },
  { id: 20, nombreCategoria: 'Hogar' },
]

describe('fuenteDesdeParam', () => {
  it('acepta url, pdf y csv; default url', () => {
    expect(fuenteDesdeParam('url')).toBe('url')
    expect(fuenteDesdeParam('pdf')).toBe('pdf')
    expect(fuenteDesdeParam('csv')).toBe('csv')
    expect(fuenteDesdeParam(null)).toBe('url')
    expect(fuenteDesdeParam('otra')).toBe('url')
  })
})

describe('agruparProductosPorCategoria', () => {
  it('agrupa por categoría y deja Sin categoría al final', () => {
    const productos = [
      producto({ _id: 1, categoriaId: 20 }),
      producto({ _id: 2, categoriaId: null }),
      producto({ _id: 3, categoriaId: 10 }),
      producto({ _id: 4, categoriaId: 10 }),
    ]
    const grupos = agruparProductosPorCategoria(productos, categorias)
    expect(grupos.map((g) => g.label)).toEqual(['Electrónica', 'Hogar', 'Sin categoría'])
    expect(grupos[0].productos).toHaveLength(2)
    expect(grupos[1].productos).toHaveLength(1)
    expect(grupos[2].productos).toHaveLength(1)
  })

  it('resuelve el nombre con nombreCategoriaImportar', () => {
    expect(nombreCategoriaImportar(categorias, 10)).toBe('Electrónica')
    expect(nombreCategoriaImportar(categorias, null)).toBe('Sin categoría')
    expect(nombreCategoriaImportar(categorias, 99)).toBe('Categoría 99')
  })
})

describe('chipsCategoriaImportar', () => {
  it('incluye Todas y un chip por grupo', () => {
    const productos = [
      producto({ _id: 1, categoriaId: 10 }),
      producto({ _id: 2 }),
    ]
    const chips = chipsCategoriaImportar(productos, categorias)
    expect(chips[0]).toEqual({ id: 'todas', label: 'Todas', cantidad: 2 })
    expect(chips).toContainEqual({ id: '10', label: 'Electrónica', cantidad: 1 })
    expect(chips).toContainEqual({ id: 'sin', label: 'Sin categoría', cantidad: 1 })
  })
})

describe('filtrarProductosPorChip', () => {
  const productos = [
    producto({ _id: 1, categoriaId: 10 }),
    producto({ _id: 2, categoriaId: null }),
    producto({ _id: 3, categoriaId: 20 }),
  ]

  it('filtra por todas, sin y por id', () => {
    expect(filtrarProductosPorChip(productos, 'todas')).toHaveLength(3)
    expect(filtrarProductosPorChip(productos, 'sin').map((p) => p._id)).toEqual([2])
    expect(filtrarProductosPorChip(productos, '10').map((p) => p._id)).toEqual([1])
  })
})
