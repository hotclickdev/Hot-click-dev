import { describe, expect, it } from 'vitest'
import { esBajada, excesosAlBajar } from './bajarPlanHelpers'

describe('bajar de plan', () => {
  it('bloquea con un exceso por recurso y no cuenta los ilimitados', () => {
    expect(excesosAlBajar({ maxProductos: 50, maxUsuarios: 2 }, { productos: 63, usuarios: 2 })).toEqual([
      { recurso: 'productos', uso: 63, limite: 50, exceso: 13 },
    ])
    expect(excesosAlBajar({ maxProductos: -1, maxUsuarios: null }, { productos: 900, usuarios: 40 })).toEqual([])
  })
  it('solo las bajadas se revisan', () => {
    expect(esBajada('NEGOCIO_PLUS', 'PYME')).toBe(true)
    expect(esBajada('PYME', 'EMPRENDEDOR')).toBe(true)
    expect(esBajada('EMPRENDEDOR', 'PYME')).toBe(false)
    expect(esBajada('PYME', 'PYME')).toBe(false)
    expect(esBajada(null, 'EMPRENDEDOR')).toBe(false)
  })
})
