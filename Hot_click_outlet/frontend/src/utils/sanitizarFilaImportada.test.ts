import { describe, expect, it } from 'vitest'
import { sanitizarFilaImportada } from './sanitizarFilaImportada'

describe('sanitizarFilaImportada', () => {
  it('conserva las columnas normales con su valor', () => {
    const fila = { nombre: 'Taladro', stock: 4, precio_venta: 12500, sku: '' }
    expect(sanitizarFilaImportada(fila)).toEqual({
      nombre: 'Taladro',
      stock: 4,
      precio_venta: 12500,
      sku: '',
    })
  })

  it('descarta un encabezado __proto__ sin contaminar Object.prototype', () => {
    // JSON.parse crea __proto__ como propiedad propia, igual que un encabezado hostil.
    const fila = JSON.parse('{"__proto__":{"pwned":true},"nombre":"Taladro"}') as Record<string, unknown>

    const limpia = sanitizarFilaImportada(fila)

    expect(Object.keys(limpia)).toEqual(['nombre'])
    expect((limpia as { pwned?: unknown }).pwned).toBeUndefined()
    expect(({} as { pwned?: unknown }).pwned).toBeUndefined()
  })

  it('descarta encabezados constructor y prototype', () => {
    const fila = JSON.parse('{"constructor":1,"prototype":2,"stock":7}') as Record<string, unknown>
    expect(sanitizarFilaImportada(fila)).toEqual({ stock: 7 })
  })

  it('devuelve un objeto plano nuevo, sin heredar el prototipo manipulado', () => {
    const fila = JSON.parse('{"__proto__":{"pwned":true},"stock":1}') as Record<string, unknown>

    const limpia = sanitizarFilaImportada(fila)

    expect(Object.getPrototypeOf(limpia)).toBe(Object.prototype)
    expect({ ...limpia }).toEqual({ stock: 1 })
  })

  it('no muta la fila original', () => {
    const fila = { nombre: 'Taladro' }
    sanitizarFilaImportada(fila)
    expect(fila).toEqual({ nombre: 'Taladro' })
  })

  it('devuelve un objeto vacío para una fila vacía', () => {
    expect(sanitizarFilaImportada({})).toEqual({})
  })
})
