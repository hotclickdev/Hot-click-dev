import { describe, expect, it } from 'vitest'
import { destinoVender } from './destinoVender'

describe('destinoVender: EMPRENDEDOR sin empresa termina el alta', () => {
  it('EMPRENDEDOR sin empresa → /registrar-negocio (no al panel)', () => {
    expect(destinoVender({ tokenVivo: true, rol: 'EMPRENDEDOR', empresaId: null })).toBe('/registrar-negocio')
  })
  it('EMPRENDEDOR con empresa → panel', () => {
    expect(destinoVender({ tokenVivo: true, rol: 'EMPRENDEDOR', empresaId: 3 })).not.toBe('/registrar-negocio')
  })
  it('comprador → /registrar-negocio', () => {
    expect(destinoVender({ tokenVivo: true, rol: 'USUARIO_FINAL', empresaId: null })).toBe('/registrar-negocio')
  })
})
