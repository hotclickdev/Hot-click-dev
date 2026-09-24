import { useState, type FormEvent } from 'react'
import { authService } from '@/services/authService'
import { useToast } from '@/components/ui/Toast'
import { mensajeErrorAuth } from '@/pages/auth/authHelpers'
import useAuthStore from '@/store/authStore'

/** Verificación de correo por OTP, reutilizable fuera del flujo de EmprendimientoForm. */
export function useVerificarCorreoOtp(correo: string) {
  const toast = useToast()
  const setCorreoVerificado = useAuthStore((s) => s.setCorreoVerificado)

  const [loading, setLoading] = useState(false)
  const [reenvioLoad, setReenvioLoad] = useState(false)
  const [otpFalló, setOtpFalló] = useState(false)
  const [error, setError] = useState('')
  const [codigoVerif, setCodigoVerif] = useState('')
  const [verificado, setVerificado] = useState(false)

  const verificar = async (e: FormEvent) => {
    e.preventDefault(); setError('')
    if (!codigoVerif.trim()) { setError('Ingresá el código de verificación'); return }
    setLoading(true)
    try {
      await authService.verificarCorreoNegocio(correo, codigoVerif.trim())
      setCorreoVerificado(true)
      setVerificado(true)
      toast({ message: '¡Correo verificado!', type: 'success' })
    } catch (err: unknown) {
      setError(mensajeErrorAuth(err, 'Código incorrecto o expirado') || 'Código incorrecto o expirado')
    } finally { setLoading(false) }
  }

  const reenviar = async () => {
    setReenvioLoad(true); setError('')
    try {
      await authService.reenviarCodigoNegocio()
      setOtpFalló(false)
      setCodigoVerif('')
      toast({ message: `Código reenviado a ${correo}`, type: 'success' })
    } catch (err: unknown) {
      toast({ message: mensajeErrorAuth(err, 'Error al reenviar el código') || 'Error al reenviar el código', type: 'error' })
    } finally { setReenvioLoad(false) }
  }

  return {
    loading, reenvioLoad, otpFalló, error, codigoVerif, verificado,
    setCodigoVerif, setOtpFalló, verificar, reenviar,
  }
}
