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
})

describe('errorPreciosPersonalizado', () => {
  it('no valida rango si el flag de modos está apagado', () => {
    expect(errorPreciosPersonalizado(true, 'RANGO', '', '', '')).toBeNull()
  })
})

describe('errorCatalogoProducto', () => {
  it('exige venta y stock en catálogo', () => {
    expect(errorCatalogoProducto(false, '', '10')).toBe('Indicá el precio de venta.')
    expect(errorCatalogoProducto(false, '5000', '0')).toMatch(/stock/)
    expect(errorCatalogoProducto(true, '', '')).toBeNull()
  })
})
