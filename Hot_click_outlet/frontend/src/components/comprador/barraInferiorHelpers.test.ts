import { describe, expect, it } from 'vitest'
import { seccionActivaBarra } from './barraInferiorHelpers'

describe('seccionActivaBarra', () => {
  it('marca Inicio solo en la raíz', () => {
    expect(seccionActivaBarra('/')).toBe('inicio')
  })

  it('agrupa rutas hijas bajo su sección', () => {
    expect(seccionActivaBarra('/productos/12')).toBe('buscar')
    expect(seccionActivaBarra('/checkout/pago')).toBe('pedido')
    expect(seccionActivaBarra('/mis-pedidos')).toBe('cuenta')
  })

  it('marca Inicio en el blog y sus entradas', () => {
    expect(seccionActivaBarra('/blog')).toBe('inicio')
    expect(seccionActivaBarra('/blog/mi-entrada')).toBe('inicio')
  })

  it('marca Inicio en /sin-conexion (Figma 45:2264)', () => {
    expect(seccionActivaBarra('/sin-conexion')).toBe('inicio')
  })

  it('marca Categorías en /productos?cat= y Buscar en el resto del catálogo', () => {
    expect(seccionActivaBarra('/productos', '?cat=3')).toBe('categorias')
    expect(seccionActivaBarra('/productos', '?search=taza')).toBe('buscar')
    expect(seccionActivaBarra('/productos')).toBe('buscar')
  })

  it('marca Cuenta en las solicitudes de Servicios HOT, no en el resto de /servicios', () => {
    expect(seccionActivaBarra('/servicios', '?vista=solicitudes')).toBe('cuenta')
    expect(seccionActivaBarra('/servicios')).toBeNull()
    expect(seccionActivaBarra('/servicios', '?vista=otra')).toBeNull()
  })

  it('no confunde prefijos parecidos', () => {
    expect(seccionActivaBarra('/productos-destacados')).toBeNull()
  })

  it('deja sin marcar las rutas fuera de la barra', () => {
    expect(seccionActivaBarra('/tienda/casa-luna')).toBeNull()
  })
})
