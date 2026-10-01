import { describe, it, expect } from 'vitest'
import type { Producto } from '@/types/producto'
import { opcionesDeTalla, opinionesDesdeRespuesta } from './productoHelpers'

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
