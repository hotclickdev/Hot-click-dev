import { describe, expect, it } from 'vitest'
import {
  aProductoListaItem,
  filtrarProductos,
  filtrosProductos,
  gruposProductosVisibles,
  type ProductoListaItem,
} from './productosListaHelpers'
import { mapCategoria } from './catalogoVendedorApi'

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

  it('en Todos muestra personalizados y no esconde Otras categorías', () => {
    const grupos = gruposProductosVisibles([
      ...lista,
      item({ id: '4', nombre: 'Cuadro', esPersonalizado: true, categoria: 'Otro' }),
      item({ id: '5', nombre: 'Lámpara', categoria: 'Otro' }),
    ], 'Todos')
    expect(grupos.map((g) => g.titulo)).toEqual(['Personalizados', 'Recién agregados', 'Tecnología', 'Ropa', 'Otro'])
    expect(grupos[0].items.map((p) => p.id)).toEqual(['4'])
    expect(grupos.find((g) => g.titulo === 'Otro')?.items.map((p) => p.id)).toEqual(['5'])
  })

  it('NP-10: usa la categoría real (Jardinería) en grupos y filtros', () => {
    const conJardin = [...lista, item({ id: '6', nombre: 'Suculenta', categoria: 'Jardinería y Plantas' })]
    expect(filtrosProductos(conJardin)).toEqual(['Todos', 'Recién agregados', 'Tecnología', 'Ropa', 'Jardinería y Plantas'])
    expect(gruposProductosVisibles(conJardin, 'Todos').map((g) => g.titulo)).toContain('Jardinería y Plantas')
    expect(mapCategoria('Jardinería y Plantas')).toBe('Jardinería y Plantas')
    expect(mapCategoria(undefined)).toBe('Sin categoría')
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
