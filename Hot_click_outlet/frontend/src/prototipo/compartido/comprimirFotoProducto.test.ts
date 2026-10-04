import { describe, expect, it } from 'vitest'
import { comprimirFotoProducto, ladoComprimido } from './comprimirFotoProducto'

describe('comprimirFotoProducto', () => {
  it('ladoComprimido no agranda y respeta el tope', () => {
    expect(ladoComprimido(800, 600, 1600)).toEqual({ ancho: 800, alto: 600 })
    expect(ladoComprimido(3200, 1600, 1600)).toEqual({ ancho: 1600, alto: 800 })
  })

  it('deja pasar archivos chicos o que no son imagen', async () => {
    const texto = new File(['hola'], 'nota.txt', { type: 'text/plain' })
    expect(await comprimirFotoProducto(texto)).toBe(texto)
    const chica = new File([new Uint8Array(100)], 'mini.jpg', { type: 'image/jpeg' })
    expect(await comprimirFotoProducto(chica)).toBe(chica)
  })
})
