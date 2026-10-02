import { describe, expect, it } from 'vitest'
import { fotoProducto, insigniaTarjeta, nombreVendedor, precioDesde, precioListaTachado, stockEscaso, tarjetaAgotada } from './productCardHelpers'

describe('tarjeta de producto del comprador', () => {
  it('muestra “Quedan N” solo con stock bajo y disponible', () => {
    expect(stockEscaso({ stock: 4 })).toBe(4)
    expect(stockEscaso({ stock: 5 })).toBe(5)
    expect(stockEscaso({ stock: 6 })).toBeNull()
    expect(stockEscaso({ stock: 0 })).toBeNull()
  })

  it('usa el nombre del negocio y cae a la bodega', () => {
    expect(nombreVendedor({ empresaNombre: 'Casa Luna 506', bodegaNombre: 'Central' })).toBe('Casa Luna 506')
    expect(nombreVendedor({ empresaNombre: '  ', bodegaNombre: 'Taller Ceiba' })).toBe('Taller Ceiba')
    expect(nombreVendedor({})).toBe('HotClick')
  })

  it('elige la foto disponible', () => {
    expect(fotoProducto({ imagenUrl: 'a.jpg', imagenPrincipalUrl: 'b.jpg' })).toBe('a.jpg')
    expect(fotoProducto({ imagenPrincipalUrl: 'b.jpg' })).toBe('b.jpg')
    expect(fotoProducto({})).toBeNull()
  })

  it('agotado: stock 0, pero un producto a cotizar con stock 0 no lo está', () => {
    expect(tarjetaAgotada({ stock: 0 })).toBe(true)
    expect(tarjetaAgotada({ stock: 3 })).toBe(false)
    expect(tarjetaAgotada({ stock: 0, esPersonalizado: true, modoPrecioPersonalizado: 'COTIZACION' })).toBe(false)
    expect(tarjetaAgotada({ stock: 0, esPersonalizado: true, modoPrecioPersonalizado: 'RANGO' })).toBe(false)
    expect(tarjetaAgotada({ stock: 0, esPersonalizado: true, modoPrecioPersonalizado: 'FIJO' })).toBe(true)
  })

  it('insignia: Hecho a pedido, luego Quedan N, luego Oferta; agotado sin insignia', () => {
    expect(insigniaTarjeta({ stock: 10, precio: 100 })).toBeNull()
    expect(insigniaTarjeta({ stock: 4 })).toEqual({ tipo: 'quedan', cantidad: 4 })
    expect(insigniaTarjeta({ stock: 10, precio: 15000, precioOferta: 11000 })).toEqual({ tipo: 'oferta' })
    // si ya hay “Quedan N”, la de oferta se omite
    expect(insigniaTarjeta({ stock: 3, precio: 15000, precioOferta: 11000 })).toEqual({ tipo: 'quedan', cantidad: 3 })
    expect(insigniaTarjeta({ stock: 3, esPersonalizado: true, modoPrecioPersonalizado: 'FIJO' })).toEqual({ tipo: 'hechoAPedido' })
    expect(insigniaTarjeta({ stock: 0, esPersonalizado: true, modoPrecioPersonalizado: 'COTIZACION' })).toEqual({ tipo: 'hechoAPedido' })
    expect(insigniaTarjeta({ stock: 0, precio: 15000, precioOferta: 11000 })).toBeNull()
  })

  it('precio de lista tachado solo con oferta activa y disponible', () => {
    expect(precioListaTachado({ stock: 5, precio: 15000, precioOferta: 11000 })).toBe(15000)
    expect(precioListaTachado({ stock: 5, precio: 15000, precioOferta: 15000 })).toBeNull()
    expect(precioListaTachado({ stock: 5, precio: 15000 })).toBeNull()
    expect(precioListaTachado({ stock: 0, precio: 15000, precioOferta: 11000 })).toBeNull()
    expect(precioListaTachado({ stock: 5, precio: 1, precioOferta: 0, esPersonalizado: true, modoPrecioPersonalizado: 'COTIZACION' })).toBeNull()
  })

  it('precio por rango: usa el mínimo; los demás modos no tienen “Desde”', () => {
    expect(precioDesde({ esPersonalizado: true, modoPrecioPersonalizado: 'RANGO', precioPersonalizadoMin: 25000, precioPersonalizadoMax: 60000 })).toBe(25000)
    expect(precioDesde({ esPersonalizado: true, modoPrecioPersonalizado: 'RANGO', precioPersonalizadoMin: 25000 })).toBeNull()
    expect(precioDesde({ esPersonalizado: true, modoPrecioPersonalizado: 'FIJO', precioPersonalizadoMin: 1, precioPersonalizadoMax: 2 })).toBeNull()
    expect(precioDesde({})).toBeNull()
  })
})
