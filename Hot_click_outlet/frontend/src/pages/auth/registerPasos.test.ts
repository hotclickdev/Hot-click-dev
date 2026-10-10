import { describe, expect, it } from 'vitest'
import { pasoAnteriorRegistro } from './registerPasos'

describe('pasoAnteriorRegistro', () => {
  it('desde datos vuelve al correo', () => {
    expect(pasoAnteriorRegistro('datos')).toBe('correo')
  })

  it('desde correo vuelve a elegir comprar o vender', () => {
    expect(pasoAnteriorRegistro('correo')).toBe('intencion')
  })

  it('desde la intención no hay paso previo en el alta', () => {
    expect(pasoAnteriorRegistro('intencion')).toBeNull()
  })
})
