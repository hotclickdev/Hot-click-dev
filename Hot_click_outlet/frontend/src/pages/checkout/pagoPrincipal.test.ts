import { describe, expect, it } from 'vitest'
import {
  PAGO_EFECTIVO, PAGO_SINPE, PAGO_TARJETA, contraEntregaDisponible, metodoProximamente, proveedorDe, sinpeManualDesdeConfig,
} from './pagoPrincipal'
import { metodosDisponibles } from './metodosPago'

describe('pago sin Tilopay', () => {
  it('ningún método va a TILOPAY', () => {
    for (const habilitado of [true, false]) {
      for (const m of [PAGO_SINPE, PAGO_TARJETA, PAGO_EFECTIVO]) expect(proveedorDe(m, habilitado)).not.toBe('TILOPAY')
    }
  })

  it('Tarjeta siempre deshabilitada («Próximamente») y sin proveedor', () => {
    expect(metodoProximamente(PAGO_TARJETA, true)).toBe(true)
    expect(metodoProximamente(PAGO_TARJETA, false)).toBe(true)
    expect(proveedorDe(PAGO_TARJETA, true)).toBeNull()
    expect(proveedorDe(PAGO_TARJETA, false)).toBeNull()
  })

  it('SINPE manual habilitado: provider SINPE', () => {
    expect(sinpeManualDesdeConfig({ sinpeManual: true })).toBe(true)
    expect(metodoProximamente(PAGO_SINPE, true)).toBe(false)
    expect(proveedorDe(PAGO_SINPE, true)).toBe('SINPE')
  })

  it('SINPE manual deshabilitado: Próximamente y sin proveedor', () => {
    expect(sinpeManualDesdeConfig({ sinpeManual: false })).toBe(false)
    expect(sinpeManualDesdeConfig({ contraEntregaNormal: true })).toBe(false)
    expect(sinpeManualDesdeConfig({ sinpeManual: 'true' })).toBe(false)
    expect(metodoProximamente(PAGO_SINPE, false)).toBe(true)
    expect(proveedorDe(PAGO_SINPE, false)).toBeNull()
    expect(proveedorDe(PAGO_SINPE)).toBeNull()
  })

  it('error o config ausente: fail-closed', () => {
    expect(sinpeManualDesdeConfig(undefined)).toBe(false)
    expect(sinpeManualDesdeConfig(null)).toBe(false)
  })

  it('efectivo sigue igual', () => {
    expect(proveedorDe(PAGO_EFECTIVO, false)).toBe('EFECTIVO')
    expect(metodoProximamente(PAGO_EFECTIVO, false)).toBe(false)
  })

  it('muestra SINPE y Tarjeta por separado', () => {
    expect(metodosDisponibles(false).map((m) => m.id)).toEqual([PAGO_SINPE, PAGO_TARJETA])
  })

  it('contra entrega solo con Envío Normal y config activa', () => {
    expect(contraEntregaDisponible(['ENVIO_NORMAL_GAM'], true)).toBe(true)
    expect(contraEntregaDisponible(['ENVIO_NORMAL_GAM', 'ENVIO_RAPIDO'], true)).toBe(false)
    expect(contraEntregaDisponible(['ENVIO_NORMAL_GAM'], false)).toBe(false)
    expect(metodosDisponibles(false, true).map((m) => m.titulo)).toEqual(['pagoSinpe', 'pagoTarjeta', 'contraEntrega'])
  })
})
