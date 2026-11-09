import { describe, expect, it } from 'vitest'
import { MENSAJE_CORREO_SIN_VERIFICAR, vistaActivarPlan } from './activarPlanVista'

const base = {
  correoVerificado: true,
  otpVerificado: false,
  hayPago: false,
  errorCobro: null as string | null,
  buscandoPlan: false,
  cargandoPlan: false,
}

describe('activar plan: correo y error de cambiar-plan', () => {
  it('sin verificación del servidor muestra el OTP y no llama a cobrar', () => {
    expect(vistaActivarPlan({ ...base, correoVerificado: false })).toBe('otp')
  })

  it('el 400 de correo sin verificar muestra el mensaje y la opción de verificar, no «Un momento…»', () => {
    expect(vistaActivarPlan({ ...base, errorCobro: MENSAJE_CORREO_SIN_VERIFICAR })).toBe('otp')
  })

  it('otro error de cambiar-plan queda visible', () => {
    expect(vistaActivarPlan({ ...base, errorCobro: 'No pudimos procesar la solicitud. Revisá los datos y probá de nuevo.' })).toBe('error')
  })

  it('correo ya verificado y sin error sigue preparando el cobro', () => {
    expect(vistaActivarPlan({ ...base, buscandoPlan: true })).toBe('cargando')
  })

  it('tras el OTP, el 400 de correo deja de tapar el reintento', () => {
    expect(vistaActivarPlan({
      ...base,
      correoVerificado: false,
      otpVerificado: true,
      errorCobro: MENSAJE_CORREO_SIN_VERIFICAR,
    })).toBe('cargando')
  })
})
