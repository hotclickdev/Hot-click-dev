import { describe, expect, it } from 'vitest'
import {
  pasosProducto,
  validarPasoProducto,
  type DatosPasoProducto,
} from './productoVendedorPasos'

const base: DatosPasoProducto = {
  personalizado: false,
  nombre: '',
  categoriaId: '',
  compra: '',
  venta: '',
  stock: '',
  descripcion: '',
  instrucciones: '',
  modoPrecio: 'COTIZACION',
  precioMin: '',
  precioMax: '',
}

describe('productoVendedorPasos', () => {
  it('pasosProducto distingue catálogo, personalizado y editar', () => {
    expect(pasosProducto(false, false).map((p) => p.id)).toEqual(['foto', 'identidad', 'precios', 'detalle'])
    expect(pasosProducto(true, false).map((p) => p.id)).toEqual(['foto', 'identidad', 'cobro', 'detalle'])
    expect(pasosProducto(false, true).at(-1)?.id).toBe('estado')
  })

  it('bloquea identidad sin nombre ni categoría', () => {
    expect(validarPasoProducto(1, base, false)).toBe('Escribí el nombre del producto.')
    expect(
      validarPasoProducto(1, { ...base, nombre: 'Camiseta' }, false),
    ).toBe('Seleccioná una categoría.')
  })

  it('bloquea precios de catálogo sin venta', () => {
    expect(
      validarPasoProducto(2, { ...base, nombre: 'X', categoriaId: '1', venta: '0' }, false),
    ).toBe('Indicá el precio de venta.')
  })

  it('exige stock en detalle de catálogo', () => {
    expect(
      validarPasoProducto(3, { ...base, nombre: 'X', categoriaId: '1', venta: '1000', stock: '0' }, false),
    ).toBe('Indicá el stock (mínimo 1 para que se vea en el catálogo).')
  })
})
