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
    ejecutarPagarCheckout({ ...d, sinpeCedula: '01-0000-0000', sinpeTipoIdentificacion: 0, sinpeTelefono: '80000000' })
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

  it('Efectivo ya no existe en el checkout web (solo POS): no inicia pago', () => {
    const { d, iniciarPago, avisarSinMetodo } = deps(PAGO_EFECTIVO, true)
    ejecutarPagarCheckout({ ...d, tarjetaOnvoHabilitada: true })
    expect(iniciarPago).not.toHaveBeenCalled()
    expect(avisarSinMetodo).toHaveBeenCalledTimes(1)
  })

  it('Tarjeta y SINPE con ONVO habilitado van a /payments/checkout con provider ONVO (nunca Tilopay)', () => {
    for (const m of [PAGO_TARJETA, PAGO_SINPE]) {
      const { d, iniciarPago } = deps(m, false)
      ejecutarPagarCheckout({ ...d, tarjetaOnvoHabilitada: true })
      expect(iniciarPago.mock.calls[0][0].provider).toBe('ONVO')
      expect(iniciarPago.mock.calls[0][2]).toBe(false)
    }
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
    const { d, avisarSinMetodo } = deps(PAGO_TARJETA, false)
    ejecutarPagarCheckout({ ...d, tarjetaOnvoHabilitada: true })
    expect(avisarSinMetodo).not.toHaveBeenCalled()
  })
})

describe('ejecutarPagarCheckout SINPE ONVO: payload del comprador', () => {
  it('manda identificación, tipo y teléfono normalizado', () => {
    const { d, iniciarPago } = deps(PAGO_SINPE, true)
    ejecutarPagarCheckout({ ...d, sinpeCedula: '3-000-000000', sinpeTipoIdentificacion: 3, sinpeTelefono: '8000 0000' })
    const body = iniciarPago.mock.calls[0][0]
    expect(body.sinpeIdentificacion).toBe('3-000-000000')
    expect(body.sinpeTipoIdentificacion).toBe(3)
    expect(body.sinpeTelefono).toBe('+50680000000')
  })

  it('identificación o teléfono inválidos: no inicia el pago y marca el error', () => {
    for (const extra of [
      { sinpeCedula: '3-000-000000', sinpeTipoIdentificacion: 0, sinpeTelefono: '80000000' },
      { sinpeCedula: '01-0000-0000', sinpeTipoIdentificacion: 0, sinpeTelefono: '8000' },
      { sinpeCedula: '01-0000-0000', sinpeTipoIdentificacion: undefined, sinpeTelefono: '80000000' },
    ]) {
      const { d, iniciarPago } = deps(PAGO_SINPE, true)
      const setSinpeCedulaErr = vi.fn()
      ejecutarPagarCheckout({ ...d, ...extra, setSinpeCedulaErr })
      expect(iniciarPago).not.toHaveBeenCalled()
      expect(setSinpeCedulaErr).toHaveBeenCalledWith('invalido')
    }
  })
})
