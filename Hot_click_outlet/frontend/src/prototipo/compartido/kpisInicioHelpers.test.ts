import { describe, expect, it } from 'vitest'
import { contarPedidosHoy, contarStockBajo, diaCivilLocal } from './kpisInicioHelpers'

describe('diaCivilLocal', () => {
  it('lee una fecha ISO con hora', () => {
    expect(diaCivilLocal('2026-10-04T15:30:00')).toBe('2026-10-04')
  })

  it('devuelve vacío si no hay fecha', () => {
    expect(diaCivilLocal('')).toBe('')
    expect(diaCivilLocal('   ')).toBe('')
  })
})

describe('contarPedidosHoy', () => {
  it('cuenta solo los del día indicado', () => {
    const pedidos = [
      { fecha: '2026-10-04T09:00:00' },
      { fecha: '2026-10-04T22:10:00' },
      { fecha: '2026-10-03T23:50:00' },
    ]
    expect(contarPedidosHoy(pedidos, '2026-10-04')).toBe(2)
  })

  it('no inventa pedidos si la fecha no se entiende', () => {
    expect(contarPedidosHoy([{ fecha: '' }, { fecha: 'ayer' }], '2026-10-04')).toBe(0)
  })
})

describe('contarStockBajo', () => {
  it('cuenta publicados con 1 a 5 unidades', () => {
    const productos = [
      { stock: 5, estado: 'Publicado' },
      { stock: 1, estado: 'Publicado' },
      { stock: 0, estado: 'Publicado' },
      { stock: 6, estado: 'Publicado' },
      { stock: 2, estado: 'Pausado' },
    ]
    expect(contarStockBajo(productos)).toBe(2)
  })
})
