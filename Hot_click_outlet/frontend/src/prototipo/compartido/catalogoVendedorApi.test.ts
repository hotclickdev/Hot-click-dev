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
