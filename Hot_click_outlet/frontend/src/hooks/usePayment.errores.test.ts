import { describe, expect, it } from 'vitest'
import { detalleErrorPago } from '@/hooks/usePayment'
import { CODIGO_CUENTA_EXISTENTE } from '@/pages/checkout/checkoutHelpers'

const RESPALDO = 'No se pudo iniciar el pago. Intenta de nuevo.'

describe('detalleErrorPago', () => {
  it('503 pagos no disponibles: muestra el mensaje del servidor, no el genérico', () => {
    const err = { response: { status: 503, data: { success: false, message: 'Los pagos con tarjeta y SINPE Móvil no están disponibles por ahora.' } } }
    expect(detalleErrorPago(err, RESPALDO)).toEqual({
      mensaje: 'Los pagos con tarjeta y SINPE Móvil no están disponibles por ahora.',
      codigo: null,
    })
  })

  it('409 cuenta existente: trae el código para ofrecer «Ingresar»', () => {
    const err = { response: { status: 409, data: { message: 'Ese correo ya tiene una cuenta. Iniciá sesión para terminar tu compra.', data: { codigo: 'CUENTA_EXISTENTE', siguientePaso: '/login?redirect=%2Fcheckout' } } } }
    const detalle = detalleErrorPago(err, RESPALDO)
    expect(detalle.codigo).toBe(CODIGO_CUENTA_EXISTENTE)
    expect(detalle.mensaje).toContain('Iniciá sesión')
  })

  it('sin respuesta del servidor usa el respaldo', () => {
    expect(detalleErrorPago(new Error('red'), RESPALDO)).toEqual({ mensaje: RESPALDO, codigo: null })
    expect(detalleErrorPago({ response: { status: 503, data: '' } }, RESPALDO).mensaje).toBe(RESPALDO)
  })
})
