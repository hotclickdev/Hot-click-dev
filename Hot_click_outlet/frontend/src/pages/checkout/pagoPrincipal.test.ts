import { describe, expect, it } from 'vitest'
import { PAGO_EFECTIVO, PAGO_SINPE, PAGO_TARJETA, contraEntregaDisponible, proveedorDe } from './pagoPrincipal'
import { metodosDisponibles } from './metodosPago'

describe('pago sin SINPE manual', () => {
  it('SINPE y Tarjeta van a la pasarela; efectivo queda como efectivo', () => {
    expect(proveedorDe(PAGO_SINPE)).toBe('TILOPAY')
    expect(proveedorDe(PAGO_TARJETA)).toBe('TILOPAY')
    expect(proveedorDe(PAGO_EFECTIVO)).toBe('EFECTIVO')
  })

  it('muestra SINPE y Tarjeta por separado, sin comprobante', () => {
    expect(metodosDisponibles(false).map((m) => m.id)).toEqual([PAGO_SINPE, PAGO_TARJETA])
  })

  it('contra entrega solo con Envío Normal y config activa', () => {
    expect(contraEntregaDisponible(['ENVIO_NORMAL_GAM'], true)).toBe(true)
    expect(contraEntregaDisponible(['ENVIO_NORMAL_GAM', 'ENVIO_RAPIDO'], true)).toBe(false)
    expect(contraEntregaDisponible(['ENVIO_NORMAL_GAM'], false)).toBe(false)
    expect(metodosDisponibles(false, true).map((m) => m.titulo)).toEqual(['pagoSinpe', 'pagoTarjeta', 'contraEntrega'])
  })
})
