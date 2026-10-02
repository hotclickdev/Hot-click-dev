import { describe, it, expect } from 'vitest'
import type { Producto } from '@/types/producto'
import { avisoStockBajoSinTalla, opcionesDeTalla, opinionesDesdeRespuesta } from './productoHelpers'

describe('ficha · opiniones', () => {
  it('lee la lista de { data: [...] } y descarta lo que no trae comentario', () => {
    const r = opinionesDesdeRespuesta({
      data: [
        { id: 1, nombreUsuario: 'Ana', comentario: ' Muy buena ', calificacion: 5 },
        { id: 2, nombreUsuario: 'Luis', comentario: '' },
        null,
      ],
    })
    expect(r).toEqual([{ id: '1', autor: 'Ana', comentario: 'Muy buena', calificacion: 5 }])
  })

  it('devuelve vacío con respuestas inesperadas', () => {
    expect(opinionesDesdeRespuesta(undefined)).toEqual([])
    expect(opinionesDesdeRespuesta({ data: 'x' })).toEqual([])
  })
})

describe('ficha · tallas', () => {
  const producto = { talla: '40,38,39,42' } as unknown as Producto

  it('mezcla tallas propias y hermanas y las ordena si son numéricas', () => {
    const o = opcionesDeTalla(producto, [{ id: 9, talla: '41', stock: 0 }])
    expect(o.map((x) => x.talla)).toEqual(['38', '39', '40', '41', '42'])
    expect(o.find((x) => x.talla === '41')).toMatchObject({ origen: 'hermana', id: 9, stock: 0 })
    expect(o.find((x) => x.talla === '40')?.origen).toBe('propia')
  })

  it('con tallas no numéricas conserva propias primero', () => {
    const o = opcionesDeTalla({ talla: 'M,S' } as unknown as Producto, [{ id: 3, talla: 'L', stock: 2 }])
    expect(o.map((x) => x.talla)).toEqual(['M', 'S', 'L'])
  })
})

describe('ficha · stock bajo sin talla', () => {
  const base = { stock: 3, esPersonalizado: false, modoPrecioPersonalizado: null } as unknown as Producto

  it('avisa en la cabecera cuando no hay selector de talla (solo color)', () => {
    expect(avisoStockBajoSinTalla({ ...base, colorVariante: 'Azul' } as Producto, [{ id: 2, colorVariante: 'Rojo' }])).toBe(true)
  })

  it('no avisa si hay tallas: el aviso vive en el selector de talla', () => {
    expect(avisoStockBajoSinTalla({ ...base, talla: '38,40' } as Producto, [])).toBe(false)
    expect(avisoStockBajoSinTalla(base, [{ id: 9, talla: '41', stock: 2 }])).toBe(false)
  })

  it('no avisa con stock suficiente, agotado, personalizado o cotizable', () => {
    expect(avisoStockBajoSinTalla({ ...base, stock: 12 } as Producto, [])).toBe(false)
    expect(avisoStockBajoSinTalla({ ...base, stock: 0 } as Producto, [])).toBe(false)
    expect(avisoStockBajoSinTalla({ ...base, esPersonalizado: true, modoPrecioPersonalizado: 'FIJO' } as Producto, [])).toBe(false)
    expect(avisoStockBajoSinTalla({ ...base, esPersonalizado: true, modoPrecioPersonalizado: 'COTIZACION' } as Producto, [])).toBe(false)
  })
})
