import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authService } from '@/services/authService'
import { useToast } from '@/components/ui/Toast'
import useAuthStore from '@/store/authStore'
import useCartStore from '@/store/cartStore'
import { abandonedCartService } from '@/services/abandonedCartService'
import { mensajeErrorAuth } from './authHelpers'

/**
 * Estado y handlers del registro (código, verificación, reenvío).
 * Orden de authService y side effects idéntico al RegisterPage original.
 */
export function useRegisterFlow() {
  const navigate   = useNavigate()
  const toast      = useToast()
  const { t }      = useTranslation()
  const loginStore = useAuthStore((s) => s.login)

  const [modo,              setModo]              = useState('comprador') // 'comprador' | 'emprendedor'
  const [step,              setStep]              = useState('form')
  const [loading,           setLoading]           = useState(false)
  const [error,             setError]             = useState('')
  const [showCartRecovery,  setShowCartRecovery]  = useState(false)
  const [recoveryCart,      setRecoveryCart]      = useState(null)
  const addItem             = useCartStore((s) => s.addItem)
  const [correoRegistro,    setCorreoRegistro]    = useState('')
  const [codigo,            setCodigo]            = useState('')
  const [form, setForm] = useState({
    nombre: '', apellidoPaterno: '', apellidoMaterno: '',
    correo: '', telefono: '', identificacion: '', contrasenaHash: '',
  })

  const actualizarCampo = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.contrasenaHash.length < 6) { setError(t('register.minChars')); return }
    setError(''); setLoading(true)
    try {
      const trimmed = {
        ...form,
        nombre:          form.nombre.trim(),
        apellidoPaterno: form.apellidoPaterno.trim(),
        apellidoMaterno: form.apellidoMaterno.trim(),
        correo:          form.correo.trim().toLowerCase(),
        telefono:        form.telefono.trim(),
        identificacion:  form.identificacion.trim(),
      }
      await authService.sendVerification(trimmed)
      setCorreoRegistro(form.correo)
      setStep('verify')
    } catch (err) {
      setError(mensajeErrorAuth(err, 'Error al enviar el código. Intentá de nuevo.') || 'Error al enviar el código. Intentá de nuevo.')
    } finally { setLoading(false) }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    if (codigo.trim().length !== 6) { setError('El código tiene 6 dígitos'); return }
    setError(''); setLoading(true)
    try {
      const res      = await authService.verifyRegistration(correoRegistro, codigo.trim())
      const authData = res.data?.data
      if (authData?.accessToken) {
        loginStore(authData)
        toast({ message: '¡Bienvenido a HotClick! Tu cuenta fue verificada.', type: 'success' })
        try {
          const { data: r } = await abandonedCartService.getAbandonedCartBySession()
          if (r?.data?.items?.length > 0) { setRecoveryCart(r.data); setShowCartRecovery(true); return }
        } catch { /* sin carrito */ }
        navigate('/')
      } else { navigate('/login') }
    } catch (err) {
      setError(mensajeErrorAuth(err, 'Código incorrecto o expirado') || 'Código incorrecto o expirado')
    } finally { setLoading(false) }
  }

  const handleReenviar = async () => {
    setError(''); setLoading(true)
    try {
      await authService.sendVerification(form)
      toast({ message: t('register.resentSuccess'), type: 'success' })
      setCodigo('')
    } catch (err) {
      setError(mensajeErrorAuth(err, 'Error al reenviar el código. Intentá de nuevo.') || 'Error al reenviar el código. Intentá de nuevo.')
    }
    finally { setLoading(false) }
  }

  return {
    t, navigate,
    modo, setModo, step, setStep, loading, error, setError,
    showCartRecovery, setShowCartRecovery, recoveryCart, addItem,
    correoRegistro, codigo, setCodigo, form, setForm,
    actualizarCampo, handleSubmit, handleVerify, handleReenviar,
  }
}
