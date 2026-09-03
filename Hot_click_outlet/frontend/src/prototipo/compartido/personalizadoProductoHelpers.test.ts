import { describe, expect, it } from 'vitest'
import {
  PRECIO_VENTA_PLACEHOLDER_COTIZACION,
  errorCatalogoProducto,
  errorPreciosPersonalizado,
  preciosAlPublicar,
} from './personalizadoProductoHelpers'

describe('preciosAlPublicar', () => {
  it('usa placeholder ₡1 en cotización', () => {
    const precios = preciosAlPublicar(true, '', '', { modoPrecio: 'COTIZACION' })
    expect(precios.precioVenta).toBe(PRECIO_VENTA_PLACEHOLDER_COTIZACION)
    expect(precios.modoPrecioPersonalizado).toBe('COTIZACION')
  })

  it('deja precios de catálogo intactos', () => {
    expect(preciosAlPublicar(false, '1000', '5000')).toEqual({
      precioCompra: '1000',
      precioVenta: '5000',
    })
  })

  it('guarda venta y compra en precio fijo', () => {
    expect(preciosAlPublicar(true, '2000', '8000', { modoPrecio: 'FIJO' })).toEqual({
      precioCompra: '2000',
      precioVenta: '8000',
      modoPrecioPersonalizado: 'FIJO',
    })
  })

  it('guarda mínimo y máximo en rango', () => {
    const precios = preciosAlPublicar(true, '', '', {
      modoPrecio: 'RANGO',
      precioMin: '5000',
      precioMax: '25000',
    })
    expect(precios.modoPrecioPersonalizado).toBe('RANGO')
    expect(precios.precioPersonalizadoMin).toBe('5000')
    expect(precios.precioPersonalizadoMax).toBe('25000')
    expect(precios.precioVenta).toBe('5000')
  })
})

describe('errorPreciosPersonalizado', () => {
  it('exige mínimo y máximo en rango', () => {
    expect(errorPreciosPersonalizado(true, 'RANGO', '', '', '')).toBe(
      'Indicá el rango de precio (mínimo y máximo).',
    )
  })

  it('exige precio de venta en fijo', () => {
    expect(errorPreciosPersonalizado(true, 'FIJO', '0', '', '')).toBe('Indicá el precio de venta.')
  })
})

describe('errorCatalogoProducto', () => {
  it('exige venta y stock en catálogo', () => {
    expect(errorCatalogoProducto(false, '', '10')).toBe('Indicá el precio de venta.')
    expect(errorCatalogoProducto(false, '5000', '0')).toMatch(/stock/)
    expect(errorCatalogoProducto(true, '', '')).toBeNull()
  })
})
