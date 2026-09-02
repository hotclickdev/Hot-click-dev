import { describe, expect, it } from 'vitest'
import {
  idCategoriaValido,
  listaCategoriasVendedor,
  nombreCategoriaVendedor,
} from './categoriaVendedor'

describe('listaCategoriasVendedor', () => {
  it('acepta array o envelope { data }', () => {
    expect(listaCategoriasVendedor([{ id: 1, nombreCategoria: 'Ropa' }])).toHaveLength(1)
    expect(listaCategoriasVendedor({ data: [{ id: 2, nombre: 'Hogar' }] })).toHaveLength(1)
    expect(listaCategoriasVendedor(null)).toEqual([])
  })
})

describe('nombreCategoriaVendedor', () => {
  it('usa nombreCategoria o nombre', () => {
    expect(nombreCategoriaVendedor({ id: 1, nombreCategoria: 'Ropa' })).toBe('Ropa')
    expect(nombreCategoriaVendedor({ id: 1, nombre: 'Hogar' })).toBe('Hogar')
    expect(nombreCategoriaVendedor({ id: 1 })).toBe('Categoría')
  })
})

describe('idCategoriaValido', () => {
  it('solo acepta ids numéricos ≥ 1', () => {
    expect(idCategoriaValido('7')).toBe('7')
    expect(idCategoriaValido('Ropa')).toBeNull()
    expect(idCategoriaValido('0')).toBeNull()
    expect(idCategoriaValido('')).toBeNull()
  })
})
