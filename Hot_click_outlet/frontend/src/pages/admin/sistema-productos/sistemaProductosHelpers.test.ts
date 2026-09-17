import { describe, expect, it } from 'vitest'
import { codigoProducto } from './sistemaProductosHelpers'
import type { Producto } from '@/types/producto'

function prod(parcial: Partial<Producto>): Producto {
  return {
    nombre: 'X',
    barcode: null,
    sku: null,
    precio: 1,
    precioCompra: 0,
    precioVenta: 1,
    stock: 1,
    imagenUrl: '',
    descripcion: '',
    categoriaId: '',
    categoriaNombre: '',
    bodegaId: '',
    bodegaNombre: '',
    bodegaPermiteRetiro: false,
    bodegaDireccion: '',
    bodegaTelefono: '',
    ...parcial,
  } as Producto
}

describe('codigoProducto', () => {
  it('usa SKU si existe', () => {
    expect(codigoProducto(prod({ sku: 'E12-0004', id: 99, numeroLocal: 4 }))).toBe('E12-0004')
  })

  it('si no hay SKU usa el número local del negocio, no el id global', () => {
    expect(codigoProducto(prod({ id: 99, numeroLocal: 4 }))).toBe('#4')
  })

  it('sin SKU ni número local no cae al id global', () => {
    expect(codigoProducto(prod({ id: 99 }))).toBe('—')
  })
})
