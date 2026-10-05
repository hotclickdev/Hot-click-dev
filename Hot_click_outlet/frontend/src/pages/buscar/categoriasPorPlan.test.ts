import { describe, expect, it } from 'vitest'
import { categoriasDelPlan, metaPagina, productoDePlan, rutaCategoriasPlan } from './categoriasPorPlan'

const categorias = [
  { id: 1, nombre: 'Accesorios', cantidad: 7, fotoUrl: null },
  { id: 6, nombre: 'Mascotas', cantidad: 2, fotoUrl: 'mascotas.jpg' },
  { id: 3, nombre: 'Hogar', cantidad: 5, fotoUrl: null },
]

describe('rutaCategoriasPlan', () => {
  it('Todos no lleva query y cada plan usa el alias del directorio', () => {
    expect(rutaCategoriasPlan(null)).toBe('/categorias')
    expect(rutaCategoriasPlan('emprendimientos')).toBe('/categorias?plan=emprendimientos')
    expect(rutaCategoriasPlan('pymes')).toBe('/categorias?plan=pymes')
    expect(rutaCategoriasPlan('negocio-plus')).toBe('/categorias?plan=negocio-plus')
  })
})

describe('categoriasDelPlan', () => {
  const productos = [
    { categoriaId: 6, empresaSlug: 'huellas' },
    { categoriaId: 6, empresaSlug: 'huellas' },
    { categoriaId: 1, empresaSlug: 'pyme-luna' },
    { categoriaId: 3, empresaSlug: 'ajena' },
  ]

  it('deja solo las categorías con productos de esas tiendas y reemplaza el conteo', () => {
    const visibles = categoriasDelPlan(categorias, productos, new Set(['huellas']))
    expect(visibles).toEqual([{ id: 6, nombre: 'Mascotas', cantidad: 2, fotoUrl: 'mascotas.jpg' }])
  })

  it('oculta la categoría en cero y ordena por conteo del plan', () => {
    const visibles = categoriasDelPlan(categorias, productos, new Set(['huellas', 'pyme-luna']))
    expect(visibles.map((c) => [c.id, c.cantidad])).toEqual([[6, 2], [1, 1]])
  })

  it('sin tiendas del plan no muestra categorías', () => {
    expect(categoriasDelPlan(categorias, productos, new Set())).toEqual([])
  })
})

describe('productoDePlan', () => {
  it('acepta el id numérico o en texto y descarta lo que no se puede contar', () => {
    expect(productoDePlan({ categoriaId: 4, empresaSlug: ' huellas ' })).toEqual({ categoriaId: 4, empresaSlug: 'huellas' })
    expect(productoDePlan({ categoriaId: '8', empresaSlug: 'luna' })).toEqual({ categoriaId: 8, empresaSlug: 'luna' })
    expect(productoDePlan({ categoriaId: 4, empresaSlug: '  ' })).toBeNull()
    expect(productoDePlan({ categoriaId: 0, empresaSlug: 'luna' })).toBeNull()
    expect(productoDePlan(null)).toBeNull()
  })
})

describe('metaPagina', () => {
  it('lee el page de Spring y un arreglo suelto', () => {
    expect(metaPagina({ content: [{ id: 1 }], totalPages: 3 })).toEqual({ items: [{ id: 1 }], totalPages: 3 })
    expect(metaPagina([{ id: 1 }])).toEqual({ items: [{ id: 1 }], totalPages: 1 })
    expect(metaPagina(null)).toEqual({ items: [], totalPages: 1 })
  })
})
