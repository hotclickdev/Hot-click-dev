import { describe, expect, it } from 'vitest'
import { agruparPorCategoria, type ProductoMuestraCategoria } from './categoryBrowseGrupos'

const producto = (id: number, categoriaId: number | '', categoriaNombre?: string): ProductoMuestraCategoria => ({
  id,
  categoriaId,
  categoriaNombre,
  nombre: `Producto ${id}`,
})

describe('agruparPorCategoria', () => {
  it('usa el nombre que trae el producto cuando la categoría es propia de un negocio', () => {
    const grupos = agruparPorCategoria(
      [producto(1, 90, 'Hogar'), producto(2, 90, 'Hogar')],
      [{ id: 101, nombreCategoria: 'Accesorios' }],
      undefined,
      8,
    )
    expect(grupos).toEqual([expect.objectContaining({ catId: '90', nombre: 'Hogar' })])
  })

  it('prefiere el nombre de la lista pública cuando existe', () => {
    const grupos = agruparPorCategoria([producto(1, 101, 'accesorios viejo')], [{ id: 101, nombreCategoria: 'Accesorios' }], undefined, 8)
    expect(grupos[0]?.nombre).toBe('Accesorios')
  })

  it('descarta categorías sin nombre en vez de mostrar "Sin nombre"', () => {
    const grupos = agruparPorCategoria([producto(1, 5), producto(2, 6, '  ')], [], undefined, 8)
    expect(grupos).toEqual([])
  })

  it('ignora productos sin categoría y ordena por cantidad', () => {
    const grupos = agruparPorCategoria(
      [producto(1, ''), producto(2, 1, 'A'), producto(3, 2, 'B'), producto(4, 2, 'B')],
      [],
      undefined,
      8,
    )
    expect(grupos.map((g) => g.nombre)).toEqual(['B', 'A'])
  })

  it('respeta las categorías fijadas desde la config y el máximo', () => {
    const productos = [producto(1, 1, 'A'), producto(2, 2, 'B'), producto(3, 3, 'C')]
    expect(agruparPorCategoria(productos, [], ['2', '3'], 8).map((g) => g.catId).sort()).toEqual(['2', '3'])
    expect(agruparPorCategoria(productos, [], undefined, 2)).toHaveLength(2)
  })
})
