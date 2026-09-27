import { describe, expect, it } from 'vitest'
import { seccionActivaBarra } from './barraInferiorHelpers'

describe('seccionActivaBarra', () => {
  it('marca Inicio solo en la raíz', () => {
    expect(seccionActivaBarra('/')).toBe('inicio')
  })

  it('agrupa rutas hijas bajo su sección', () => {
    expect(seccionActivaBarra('/productos/12')).toBe('buscar')
    expect(seccionActivaBarra('/checkout/pago')).toBe('pedido')
    expect(seccionActivaBarra('/mis-pedidos')).toBe('cuenta')
  })

  it('no confunde prefijos parecidos', () => {
    expect(seccionActivaBarra('/productos-destacados')).toBeNull()
  })

  it('deja sin marcar las rutas fuera de la barra', () => {
    expect(seccionActivaBarra('/tienda/casa-luna')).toBeNull()
  })
})
