import { describe, expect, it } from 'vitest'
import { cuerpoProductoVendedor } from './catalogoVendedorApi'

describe('cuerpoProductoVendedor', () => {
  it('manda categoriaId numérico y precioVenta ≥ 1 en cotización', () => {
    const dto = cuerpoProductoVendedor({
      nombre: 'Cuadros personalizados',
      precioCompra: '0',
      precioVenta: '0',
      descripcion: 'Al gusto',
      stock: '',
      categoria: 'Ropa',
      categoriaId: '7',
      esPersonalizado: true,
      modoPrecioPersonalizado: 'COTIZACION',
    })
    expect(dto.categoriaId).toBe(7)
    expect(dto.esPersonalizado).toBe(true)
    expect(dto.precioVenta).toBe(1)
    expect(dto.stockActual).toBe(1)
    expect(dto.modoPrecioPersonalizado).toBe('COTIZACION')
  })

  it('manda precios de rango y no fuerza cotización', () => {
    const dto = cuerpoProductoVendedor({
      nombre: 'Cuadro',
      precioCompra: '0',
      precioVenta: '0',
      descripcion: '',
      stock: '1',
      categoria: 'Hogar',
      categoriaId: '3',
      esPersonalizado: true,
      modoPrecioPersonalizado: 'RANGO',
      precioPersonalizadoMin: '5000',
      precioPersonalizadoMax: '20000',
    })
    expect(dto.modoPrecioPersonalizado).toBe('RANGO')
    expect(dto.precioPersonalizadoMin).toBe(5000)
    expect(dto.precioPersonalizadoMax).toBe(20000)
    expect(dto.precioVenta).toBe(5000)
  })

  it('manda precio fijo del vendedor', () => {
    const dto = cuerpoProductoVendedor({
      nombre: 'Camisa',
      precioCompra: '3000',
      precioVenta: '8000',
      descripcion: '',
      stock: '2',
      categoria: 'Ropa',
      categoriaId: '1',
      esPersonalizado: true,
      modoPrecioPersonalizado: 'FIJO',
    })
    expect(dto.modoPrecioPersonalizado).toBe('FIJO')
    expect(dto.precioCompra).toBe(3000)
    expect(dto.precioVenta).toBe(8000)
  })

  it('deja categoriaId null si solo vino el nombre visual', () => {
    const dto = cuerpoProductoVendedor({
      nombre: 'Cuadro',
      precioCompra: '0',
      precioVenta: '0',
      descripcion: '',
      stock: '1',
      categoria: 'Ropa',
    })
    expect(dto.categoriaId).toBeNull()
  })
})
