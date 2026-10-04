import { describe, expect, it } from 'vitest'
import { categoriasDelMenu, filtrarMenu, fmt, numeroConGato } from './selfCheckoutFormat'

const menu = [
  { nombre: 'Caja', categoria: 'Comidas y bebidas' },
  { nombre: 'Zapatos running rojo', categoria: 'Deportes' },
  { nombre: 'Funda de silicona para iPhone', categoria: 'Accesorios' },
  { nombre: 'Sin categoría', categoria: null },
]

describe('selfCheckoutFormat', () => {
  it('formatea colones con punto de miles', () => {
    expect(fmt(10500)).toBe('₡10.500')
    expect(fmt(undefined)).toBe('₡0')
  })

  it('antepone # al número de pedido una sola vez', () => {
    expect(numeroConGato('Q-58')).toBe('#Q-58')
    expect(numeroConGato('#Q-58')).toBe('#Q-58')
  })

  it('lista las categorías sin repetir ni vacías', () => {
    expect(categoriasDelMenu([...menu, { nombre: 'Otra', categoria: 'Deportes' }])).toEqual([
      'Comidas y bebidas',
      'Deportes',
      'Accesorios',
    ])
  })

  it('filtra por categoría y por texto', () => {
    expect(filtrarMenu(menu, null, '')).toHaveLength(4)
    expect(filtrarMenu(menu, 'Deportes', '')).toHaveLength(1)
    expect(filtrarMenu(menu, null, '  FUNDA ')).toHaveLength(1)
    expect(filtrarMenu(menu, 'Deportes', 'funda')).toHaveLength(0)
  })
})
