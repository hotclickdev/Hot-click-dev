import { describe, expect, it } from 'vitest'
import { tabsAprobacion } from './aprobacionesHelpers'

describe('tabsAprobacion', () => {
  it('oculta tab Productos cuando no hay filas legacy', () => {
    expect(tabsAprobacion({ pendientes: 2, productos: 0, ofertas: 1, cobro: 0 }).map((t) => t.id))
      .toEqual(['empresas', 'ofertas', 'cobro'])
  })

  it('muestra tab Productos solo si hay pendientes legacy', () => {
    expect(tabsAprobacion({ pendientes: 0, productos: 3, ofertas: 0, cobro: 1 }).map((t) => t.id))
      .toEqual(['empresas', 'productos', 'ofertas', 'cobro'])
  })
})
