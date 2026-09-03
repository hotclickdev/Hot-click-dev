import { describe, expect, it } from 'vitest'
import { etiquetaPrecioChat, requiereFichaEncargo } from './chatProductoPrecio'

describe('chatProductoPrecio', () => {
  it('cotización muestra A cotizar y no ₡1', () => {
    const p = {
      precio: 1,
      esPersonalizado: true,
      modoPrecioPersonalizado: 'COTIZACION' as const,
    }
    expect(etiquetaPrecioChat(p)).toBe('A cotizar')
    expect(requiereFichaEncargo(p)).toBe(true)
  })

  it('rango muestra desde-hasta', () => {
    const txt = etiquetaPrecioChat({
      esPersonalizado: true,
      modoPrecioPersonalizado: 'RANGO',
      precioPersonalizadoMin: 10000,
      precioPersonalizadoMax: 25000,
    })
    expect(txt).toContain('Desde')
    expect(txt).toContain('10')
    expect(txt).toContain('25')
    expect(requiereFichaEncargo({
      esPersonalizado: true,
      modoPrecioPersonalizado: 'RANGO',
    })).toBe(true)
  })

  it('FIJO personalizado permite carrito', () => {
    expect(requiereFichaEncargo({
      esPersonalizado: true,
      modoPrecioPersonalizado: 'FIJO',
      precio: 15000,
    })).toBe(false)
    expect(etiquetaPrecioChat({
      esPersonalizado: true,
      modoPrecioPersonalizado: 'FIJO',
      precio: 15000,
    })).toContain('15')
  })

  it('producto normal sin personalizado', () => {
    expect(requiereFichaEncargo({ precio: 5000 })).toBe(false)
    expect(etiquetaPrecioChat({ precio: 5000 })).toContain('5')
  })
})
