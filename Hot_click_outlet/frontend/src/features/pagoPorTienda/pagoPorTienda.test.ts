import { describe, expect, it } from 'vitest'
import { AVISO_CARGO_POR_TIENDA, debeAvisarCargoPorTienda } from './pagoPorTienda'

describe('S2-27 aviso de un cargo por tienda', () => {
  it('solo con pago por tienda activo y 2 o más tiendas', () => {
    expect(debeAvisarCargoPorTienda(true, 2)).toBe(true)
    expect(debeAvisarCargoPorTienda(true, 1)).toBe(false)
    expect(debeAvisarCargoPorTienda(false, 3)).toBe(false)
    expect(AVISO_CARGO_POR_TIENDA).toBe('Vas a ver un cargo por cada tienda.')
  })
})
