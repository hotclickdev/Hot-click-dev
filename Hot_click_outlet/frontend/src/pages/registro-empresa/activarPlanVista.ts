/** Mensaje exacto de POST /billing/cambiar-plan cuando el correo del dueño no está verificado. */
export const MENSAJE_CORREO_SIN_VERIFICAR = 'Verificá tu correo antes de activar un plan de pago'

export function esErrorCorreoSinVerificar(mensaje: string | null | undefined): boolean {
  return mensaje === MENSAJE_CORREO_SIN_VERIFICAR
}

export type VistaActivarPlan = 'otp' | 'pago' | 'error' | 'cargando'

/**
 * OTP si el servidor (o el store) dice que el correo no está verificado, o si cambiar-plan
 * respondió 400 pidiendo verificarlo. El error de ese 400 no puede quedar tapado por «Un momento…».
 */
export function vistaActivarPlan(s: {
  correoVerificado: boolean
  otpVerificado: boolean
  hayPago: boolean
  errorCobro: string | null
  buscandoPlan: boolean
  cargandoPlan: boolean
}): VistaActivarPlan {
  const faltaCorreo = !s.otpVerificado && (!s.correoVerificado || esErrorCorreoSinVerificar(s.errorCobro))
  if (faltaCorreo) return 'otp'
  if (s.otpVerificado && esErrorCorreoSinVerificar(s.errorCobro)) return 'cargando'
  if (s.hayPago) return 'pago'
  if (s.errorCobro && !s.buscandoPlan && !s.cargandoPlan) return 'error'
  return 'cargando'
}
