import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Producto } from '@/types/producto'
import { fuenteMasDeLaMarca, inicialesMarca, productosMasDeLaMarca, totalMasDeLaMarca } from './masDeLaMarcaHelpers'

const p = (id: number) => ({ id, nombre: `P${id}` }) as unknown as Producto

describe('fuenteMasDeLaMarca', () => {
  it('usa la marca cuando tiene id y nombre distinto de la tienda', () => {
    const f = fuenteMasDeLaMarca({ marcaId: 7, marcaNombre: 'Casa Luna', empresaNombre: 'Tienda Sol', empresaSlug: 'tienda-sol' })
    expect(f).toMatchObject({ tipo: 'marca', marcaId: 7, nombre: 'Casa Luna', verTodos: '/productos?marcaId=7&marcaNombre=Casa%20Luna' })
  })

  it('cae a la tienda si la marca es la misma tienda', () => {
    const f = fuenteMasDeLaMarca({ marcaId: 7, marcaNombre: 'Casa Luna', empresaNombre: 'Casa Luna 506', empresaSlug: 'casa-luna' })
    expect(f).toMatchObject({ tipo: 'tienda', slug: 'casa-luna', nombre: 'Casa Luna 506', verTodos: '/tienda/casa-luna' })
  })

  it('cae a la tienda si no hay marcaId', () => {
    expect(fuenteMasDeLaMarca({ marcaId: null, marcaNombre: 'X', empresaNombre: 'Tienda', empresaSlug: 't' })?.tipo).toBe('tienda')
  })

  it('sin marca ni tienda no hay fila', () => {
    expect(fuenteMasDeLaMarca({ marcaId: null, marcaNombre: '', empresaNombre: 'Tienda', empresaSlug: null })).toBeNull()
    expect(fuenteMasDeLaMarca(null)).toBeNull()
  })
})

describe('productosMasDeLaMarca', () => {
  it('excluye el producto actual (página o lista)', () => {
    expect(productosMasDeLaMarca({ content: [p(1), p(2), p(3)] }, 2).map((x) => x.id)).toEqual([1, 3])
    expect(productosMasDeLaMarca([p(1), p(2)], 1).map((x) => x.id)).toEqual([2])
  })

  it('vacío si la API devuelve algo raro o solo el actual', () => {
    expect(productosMasDeLaMarca(null, 1)).toEqual([])
    expect(productosMasDeLaMarca({ content: [p(1)] }, 1)).toEqual([])
  })
})

describe('totalMasDeLaMarca', () => {
  it('descuenta el actual del total de la página', () => {
    expect(totalMasDeLaMarca({ totalElements: 12 }, 5)).toBe(11)
  })
  it('sin totalElements usa los visibles', () => {
    expect(totalMasDeLaMarca([p(1), p(2)], 2)).toBe(2)
    expect(totalMasDeLaMarca({ totalElements: 1 }, 3)).toBe(3)
  })
})

describe('inicialesMarca', () => {
  it('toma hasta dos iniciales de palabras con letra', () => {
    expect(inicialesMarca('Casa Luna 506')).toBe('CL')
    expect(inicialesMarca('ánima')).toBe('Á')
  })
})

describe('ficha: wiring de "Más de esta marca"', () => {
  const aqui = dirname(fileURLToPath(import.meta.url))
  it('va debajo de "También te puede gustar" y antes de las pestañas', () => {
    const ficha = readFileSync(resolve(aqui, '../ProductDetailPage.tsx'), 'utf8')
    const recomendados = ficha.indexOf('id="recomendados-producto"')
    const fila = ficha.indexOf('<MasDeLaMarca ')
    expect(recomendados).toBeGreaterThan(0)
    expect(fila).toBeGreaterThan(recomendados)
    expect(fila).toBeLessThan(ficha.indexOf('<ProductTabs '))
  })
  it('no dibuja nada sin productos y usa radios del manual', () => {
    const comp = readFileSync(resolve(aqui, 'MasDeLaMarca.tsx'), 'utf8')
    expect(comp).toContain('productos.length === 0) return null')
    expect(comp).not.toMatch(/rounded-(xl|lg|md)\b/)
  })
})
