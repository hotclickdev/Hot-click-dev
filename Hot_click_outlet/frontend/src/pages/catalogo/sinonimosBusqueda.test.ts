import { describe, expect, it } from 'vitest'
import { distanciaMaxima, palabraEnTexto, sinonimosDe } from './sinonimosBusqueda'
import { filtrarProductosConsulta } from './buscarExplorar'
import type { Producto } from '@/types/producto'

describe('sinonimosBusqueda', () => {
  it('conoce sinónimos ticos', () => {
    expect(sinonimosDe('salveque')).toContain('mochila')
    expect(sinonimosDe('chancletas')).toContain('sandalias')
  })
  it('distancia acotada', () => {
    expect(distanciaMaxima('artesania', 'artesnia', 1)).toBe(true)
    expect(distanciaMaxima('cafe', 'cama', 1)).toBe(false)
  })
  it('tolera un error de tipeo en palabras largas pero no en cortas', () => {
    expect(palabraEnTexto('mochlia', 'mochila azul', ['mochila', 'azul'])).toBe(true)
    expect(palabraEnTexto('cafa', 'cafe molido', ['cafe', 'molido'])).toBe(false)
  })
  it('el catálogo encuentra por sinónimo y con typo', () => {
    const catalogo = [
      { id: 1, nombre: 'Mochila de cuero' },
      { id: 2, nombre: 'Taza de barro' },
    ] as unknown as Producto[]
    expect(filtrarProductosConsulta(catalogo, 'salveque').map((p) => p.id)).toEqual([1])
    expect(filtrarProductosConsulta(catalogo, 'mochlia').map((p) => p.id)).toEqual([1])
  })
})