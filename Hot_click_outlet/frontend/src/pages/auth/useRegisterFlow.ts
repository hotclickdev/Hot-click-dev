import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authService } from '@/services/authService'
import { useToast } from '@/components/ui/Toast'
import useAuthStore from '@/store/authStore'
import useCartStore from '@/store/cartStore'
import { abandonedCartService } from '@/services/abandonedCartService'
import { mensajeErrorAuth } from './authHelpers'
import type { AuthResponse } from '@/types/auth'
import type { CarritoRecuperable } from './CartModal'

export type RegistroCompradorForm = {
  nombre: string
  apellidoPaterno: string
  apellidoMaterno: string
  correo: string
  telefono: string
  identificacion: string
  contrasenaHash: string
}

function authDataDesdeVerify(data: unknown): AuthResponse | undefined {
  if (!data || typeof data !== 'object') return undefined
  return (data as { data?: AuthResponse }).data
}

function carritoDesdeSesion(res: unknown): CarritoRecuperable | null {
  if (!res || typeof res !== 'object') return null
  const r = res as { data?: CarritoRecuperable }
  if (r.data?.items && r.data.items.length > 0) return r.data
  return null
}

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
  const [recoveryCart,      setRecoveryCart]      = useState<CarritoRecuperable | null>(null)
  const addItem             = useCartStore((s) => s.addItem)
  const [correoRegistro,    setCorreoRegistro]    = useState('')
  const [codigo,            setCodigo]            = useState('')
  const [form, setForm] = useState<RegistroCompradorForm>({
    nombre: '', apellidoPaterno: '', apellidoMaterno: '',
    correo: '', telefono: '', identificacion: '', contrasenaHash: '',
  })

  const actualizarCampo = (field: keyof RegistroCompradorForm) => (e: ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
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
    } catch (err: unknown) {
      setError(mensajeErrorAuth(err, 'Error al enviar el código. Intentá de nuevo.') || 'Error al enviar el código. Intentá de nuevo.')
    } finally { setLoading(false) }
  }

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault()
    if (codigo.trim().length !== 6) { setError('El código tiene 6 dígitos'); return }
    setError(''); setLoading(true)
    try {
      const res      = await authService.verifyRegistration(correoRegistro, codigo.trim())
      const authData = authDataDesdeVerify(res.data)
      if (authData?.accessToken) {
        loginStore(authData)
        toast({ message: '¡Bienvenido a HotClick! Tu cuenta fue verificada.', type: 'success' })
        try {
          const { data: r } = await abandonedCartService.getAbandonedCartBySession()
          const cart = carritoDesdeSesion(r)
          if (cart) { setRecoveryCart(cart); setShowCartRecovery(true); return }
        } catch { /* sin carrito */ }
        navigate('/')
      } else { navigate('/login') }
    } catch (err: unknown) {
      setError(mensajeErrorAuth(err, 'Código incorrecto o expirado') || 'Código incorrecto o expirado')
    } finally { setLoading(false) }
  }

  const handleReenviar = async () => {
    setError(''); setLoading(true)
    try {
      await authService.sendVerification(form)
      toast({ message: t('register.resentSuccess'), type: 'success' })
      setCodigo('')
    } catch (err: unknown) {
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

export type RegisterFlow = ReturnType<typeof useRegisterFlow>
