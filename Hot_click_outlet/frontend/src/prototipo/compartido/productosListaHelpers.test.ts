import { describe, expect, it } from 'vitest'
import {
  aProductoListaItem,
  filtrarProductos,
  gruposProductosVisibles,
  type ProductoListaItem,
} from './productosListaHelpers'

function item(parcial: Partial<ProductoListaItem> & Pick<ProductoListaItem, 'id' | 'nombre'>): ProductoListaItem {
  return {
    categoria: 'Tecnología',
    precio: 1000,
    estado: 'Publicado',
    reciente: false,
    ...parcial,
  }
}

describe('productosListaHelpers', () => {
  const lista = [
    item({ id: '1', nombre: 'A', reciente: true, categoria: 'Tecnología' }),
    item({ id: '2', nombre: 'B', reciente: false, categoria: 'Tecnología' }),
    item({ id: '3', nombre: 'C', reciente: false, categoria: 'Ropa' }),
  ]

  it('filtrarProductos Todos / categoría / recientes', () => {
    expect(filtrarProductos(lista, 'Todos')).toHaveLength(3)
    expect(filtrarProductos(lista, 'Recién agregados').map((p) => p.id)).toEqual(['1'])
    expect(filtrarProductos(lista, 'Ropa').map((p) => p.id)).toEqual(['3'])
  })

  it('gruposProductosVisibles omite vacíos en Todos', () => {
    const grupos = gruposProductosVisibles(lista, 'Todos')
    expect(grupos.map((g) => g.titulo)).toEqual(['Recién agregados', 'Tecnología', 'Ropa'])
    expect(grupos.find((g) => g.titulo === 'Tecnología')?.items.map((p) => p.id)).toEqual(['2'])
  })

  it('aProductoListaItem normaliza recienAgregado', () => {
    expect(aProductoListaItem({
      id: 'x',
      nombre: 'X',
      categoria: 'Otro',
      precio: 1,
      estado: 'Pausado',
      recienAgregado: true,
    }).reciente).toBe(true)
  })
})
