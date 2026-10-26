import { describe, expect, it } from 'vitest'
import { destinoSuspension, esErrorSuscripcionImpaga, RUTA_CUENTA_SUSPENDIDA } from './suspensionImpaga'

describe('suscripción impaga', () => {
  it('detecta el 403 SUSCRIPCION_IMPAGA (plano o en data)', () => {
    expect(esErrorSuscripcionImpaga({ response: { status: 403, data: { codigo: 'SUSCRIPCION_IMPAGA' } } })).toBe(true)
    expect(esErrorSuscripcionImpaga({ response: { status: 403, data: { data: { codigo: 'SUSCRIPCION_IMPAGA' } } } })).toBe(true)
    expect(esErrorSuscripcionImpaga({ response: { status: 403, data: { error: 'otro' } } })).toBe(false)
    expect(esErrorSuscripcionImpaga({ response: { status: 402, data: { codigo: 'SUSCRIPCION_IMPAGA' } } })).toBe(false)
    expect(esErrorSuscripcionImpaga(new Error('x'))).toBe(false)
  })

  it('redirige cualquier ruta del panel a la pantalla de pago', () => {
    for (const r of ['/emprendedor', '/pyme/productos', '/pyme/ventas', '/caja', '/negocio-plus/reportes', '/admin']) {
      expect(destinoSuspension(true, r)).toBe(RUTA_CUENTA_SUSPENDIDA)
    }
    expect(destinoSuspension(true, RUTA_CUENTA_SUSPENDIDA)).toBeNull()
    expect(destinoSuspension(true, '/login')).toBeNull()
    expect(destinoSuspension(false, '/pyme/productos')).toBeNull()
  })
})
