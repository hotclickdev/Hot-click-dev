import { describe, expect, it, vi } from 'vitest'

vi.mock('@/services/authService', () => ({ authService: { registrarConsentimiento: vi.fn() } }))
vi.mock('@/utils/analytics', () => ({ analytics: { checkoutStart: vi.fn() } }))
vi.mock('@/utils/attribution', () => ({ attributionForCheckout: () => null }))
vi.mock('@/utils/metaPixel', () => ({ readMetaCookies: () => ({}) }))
vi.mock('@/utils/ultimoPedido', () => ({ guardarUltimoPedido: vi.fn() }))

import { ejecutarPagarCheckout } from './ejecutarPagarCheckout'
import { PAGO_EFECTIVO, PAGO_SINPE, PAGO_TARJETA } from './pagoPrincipal'

function deps(metodoPago: string, sinpeManualHabilitado?: boolean) {
  const iniciarPago = vi.fn()
  const avisarSinMetodo = vi.fn()
  const noop = () => {}
  return {
    iniciarPago,
    avisarSinMetodo,
    d: {
      aceptaDatos: true, validateDomicilio: () => true, token: 'tok',
      validateGuestEmail: () => '', validatePhone: () => '', guestEmail: '',
      setGuestEmailError: noop, setGuestEmailDirty: noop, guestPhone: '',
      setGuestPhoneError: noop, setGuestPhoneDirty: noop, metodoPago,
      sinpeNombre: 'Ana', sinpeCedula: '', setSinpeNombreErr: noop, setSinpeCedulaErr: noop,
      telefono: '', metodoEnvio: 'RETIRO_EN_TIENDA', paquetes: [], metodoEnvioPorPaquete: {},
      necesitaDireccion: false, notas: '', direccion: '', sinpeEmail: '', totalFinal: 0,
      items: [], bodegaRetiro: null, cuponCodigo: null, gcCodigo: null, sinpeTelefono: '',
      iniciarPago, sinpeManualHabilitado, avisarSinMetodo,
    } as unknown as Parameters<typeof ejecutarPagarCheckout>[0],
  }
}

describe('ejecutarPagarCheckout sin Tilopay', () => {
  it('SINPE habilitado: /sinpe/checkout con provider SINPE (isSinpe=true)', () => {
    const { d, iniciarPago } = deps(PAGO_SINPE, true)
    ejecutarPagarCheckout(d)
    expect(iniciarPago).toHaveBeenCalledTimes(1)
    expect(iniciarPago.mock.calls[0][0].provider).toBe('SINPE')
    expect(iniciarPago.mock.calls[0][2]).toBe(true)
  })

  it('SINPE deshabilitado o config con error: no inicia ningún pago', () => {
    for (const h of [false, undefined]) {
      const { d, iniciarPago } = deps(PAGO_SINPE, h)
      ejecutarPagarCheckout(d)
      expect(iniciarPago).not.toHaveBeenCalled()
    }
  })

  it('Tarjeta nunca inicia pago', () => {
    for (const h of [true, false]) {
      const { d, iniciarPago } = deps(PAGO_TARJETA, h)
      ejecutarPagarCheckout(d)
      expect(iniciarPago).not.toHaveBeenCalled()
    }
  })

  it('Efectivo sigue por el flujo manual', () => {
    const { d, iniciarPago } = deps(PAGO_EFECTIVO, false)
    ejecutarPagarCheckout(d)
    expect(iniciarPago.mock.calls[0][0].provider).toBe('EFECTIVO')
    expect(iniciarPago.mock.calls[0][2]).toBe(true)
  })

  it('sin método disponible: muestra el aviso y no inicia pago (nunca mudo)', () => {
    for (const m of [PAGO_TARJETA, PAGO_SINPE]) {
      const { d, iniciarPago, avisarSinMetodo } = deps(m, false)
      ejecutarPagarCheckout(d)
      expect(avisarSinMetodo).toHaveBeenCalledTimes(1)
      expect(iniciarPago).not.toHaveBeenCalled()
    }
  })

  it('con método disponible no avisa', () => {
    const { d, avisarSinMetodo } = deps(PAGO_EFECTIVO, false)
    ejecutarPagarCheckout(d)
    expect(avisarSinMetodo).not.toHaveBeenCalled()
  })
})
