import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import AuthLayout from '@/layouts/AuthLayout'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { authService } from '@/services/authService'
import { useToast } from '@/components/ui/Toast'
import useAuthStore from '@/store/authStore'
import useCartStore from '@/store/cartStore'
import Modal from '@/components/ui/Modal'
import { abandonedCartService } from '@/services/abandonedCartService'

export default function RegisterPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { t } = useTranslation()
  const loginStore = useAuthStore((s) => s.login)

  const [step, setStep]                 = useState('form')   // 'form' | 'verify'
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [showCartRecovery, setShowCartRecovery] = useState(false)
  const [recoveryCart, setRecoveryCart] = useState(null)
  const addItem = useCartStore((s) => s.addItem)
  const [correoRegistro, setCorreoRegistro] = useState('')
  const [codigo, setCodigo]             = useState('')
  const [form, setForm] = useState({
    nombre: '', apellidoPaterno: '', apellidoMaterno: '',
    correo: '', telefono: '', identificacion: '', contrasenaHash: '',
  })

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  // Paso 1 — enviar formulario y código al correo
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.contrasenaHash.length < 6) { setError(t('register.minChars')); return }
    setError('')
    setLoading(true)
    try {
      const trimmed = {
        ...form,
        nombre: form.nombre.trim(),
        apellidoPaterno: form.apellidoPaterno.trim(),
        apellidoMaterno: form.apellidoMaterno.trim(),
        correo: form.correo.trim().toLowerCase(),
        telefono: form.telefono.trim(),
        identificacion: form.identificacion.trim(),
      }
      await authService.sendVerification(trimmed)
      setCorreoRegistro(form.correo)
      setStep('verify')
    } catch (err) {
      const msg = err.response?.data?.message
      setError(typeof msg === 'string' && msg ? msg : 'Error al enviar el código. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // Paso 2 — verificar código e iniciar sesión automáticamente
  const handleVerify = async (e) => {
    e.preventDefault()
    if (codigo.trim().length !== 6) { setError('El código tiene 6 dígitos'); return }
    setError('')
    setLoading(true)
    try {
      const res = await authService.verifyRegistration(correoRegistro, codigo.trim())
      const authData = res.data?.data
      if (authData?.accessToken) {
        loginStore(authData)
        toast({ message: '¡Bienvenido a HOTCLICK! Tu cuenta fue verificada.', type: 'success' })
        try {
          const { data: res } = await abandonedCartService.getAbandonedCartBySession()
          if (res?.data?.items?.length > 0) {
            setRecoveryCart(res.data)
            setShowCartRecovery(true)
            return
          }
        } catch { /* no cart */ }
        navigate('/')
      } else {
        // fallback: si no vienen tokens redirigir a login
        navigate('/login')
      }
    } catch (err) {
      const msg = err.response?.data?.message
      setError(typeof msg === 'string' && msg ? msg : 'Código incorrecto o expirado')
    } finally {
      setLoading(false)
    }
  }

  // Reenviar código (volver al paso 1 con los datos actuales)
  const handleReenviar = async () => {
    setError('')
    setLoading(true)
    try {
      await authService.sendVerification(form)
      toast({ message: t('register.resentSuccess'), type: 'success' })
      setCodigo('')
    } catch {
      setError(t('register.minChars'))
    } finally {
      setLoading(false)
    }
  }

  // ── Paso 2: Verificar código ─────────────────────────────────────────────────
  if (step === 'verify') {
    return (
      <AuthLayout>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', boxShadow: '0 24px 64px color-mix(in srgb, var(--hc-shadow) 60%, transparent)' }}
        >
          {/* barra de progreso superior */}
          <div className="h-1"
            style={{ background: 'linear-gradient(90deg, #4f7cff, #7c3aed)' }} />

          <div className="p-8">
            {/* encabezado */}
            <div className="text-center mb-7">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full bg-[#4f7cff]/20 animate-ping opacity-40" />
                <div className="relative w-16 h-16 rounded-full bg-[#4f7cff]/15 border border-[#4f7cff]/30 flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#4f7cff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl font-bold text-[#e8e8ed] mb-1">{t('register.verifyTitle')}</h1>
              <p className="text-sm text-[#8e8e9a] leading-relaxed">
                {t('register.verifyCodeSent')}{' '}
                <span className="text-[#e8e8ed] font-semibold">{correoRegistro}</span>
              </p>
            </div>

            {/* aviso de seguridad */}
            <div className="flex items-start gap-2.5 bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3 mb-5">
              <svg className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m0-6v2m0 8a9 9 0 100-18 9 9 0 000 18z" />
              </svg>
              <p className="text-xs text-amber-300 leading-relaxed">
                <span className="font-semibold">Este código es para verificar tu cuenta.</span>{' '}
                No lo compartas con nadie. HOTCLICK nunca te lo pedirá.
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#8e8e9a] mb-2">{t('register.verificationCode')}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  autoFocus
                  className="w-full text-center text-4xl font-black tracking-[0.6em] py-5 px-4
                    bg-[#111114] border-2 border-white/8 rounded-2xl text-[#e8e8ed]
                    focus:outline-none focus:border-[#4f7cff] focus:ring-2 focus:ring-[#4f7cff]/20
                    placeholder:text-[#2a2a35] transition-all duration-200"
                />
                <p className="text-xs text-[#5e5e6e] text-center mt-2">Ingresá los 6 dígitos que llegaron a tu correo</p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {error}
                </motion.div>
              )}

              <Button type="submit" loading={loading} className="w-full" size="lg">
                {t('register.verifyBtn')}
              </Button>
            </form>

            <div className="mt-5 text-center space-y-2">
              <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                {t('register.noEmail')}{' '}
                <button
                  onClick={handleReenviar}
                  disabled={loading}
                  className="hc-underline-hover disabled:opacity-50 font-medium"
                  style={{ color: 'var(--hc-accent)' }}
                >
                  {t('register.resend')}
                </button>
              </p>
              <p className="text-xs">
                <button onClick={() => { setStep('form'); setError('') }} style={{ color: 'var(--hc-muted)' }}>
                  ← {t('register.backToForm')}
                </button>
              </p>
            </div>
          </div>
        </motion.div>
      </AuthLayout>
    )
  }

  // ── Paso 1: Formulario de registro ───────────────────────────────────────────
  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', boxShadow: '0 24px 64px color-mix(in srgb, var(--hc-shadow) 60%, transparent)' }}
      >
        <div className="h-0.5"
          style={{ background: 'linear-gradient(90deg, transparent, var(--hc-accent), color-mix(in srgb, var(--hc-accent) 60%, #a78bfa), transparent)' }} />
        <div className="p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--hc-text)' }}>{t('register.title')}</h1>
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>{t('register.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label={`${t('register.name')} *`} value={form.nombre} onChange={set('nombre')} required placeholder="Juan" />
            <Input label={`${t('register.lastName')} *`} value={form.apellidoPaterno} onChange={set('apellidoPaterno')} required placeholder="Pérez" />
          </div>
          <Input label={t('register.motherLastName')} value={form.apellidoMaterno} onChange={set('apellidoMaterno')} placeholder={t('common.optional')} />
          <Input label={`${t('register.email')} *`} type="email" value={form.correo} onChange={set('correo')} required placeholder="tu@email.com" />
          <div className="grid grid-cols-2 gap-3">
            <Input label={`${t('register.phone')} *`} type="tel" value={form.telefono} onChange={set('telefono')} required placeholder="8888-8888" />
            <Input label={`${t('register.identification')} *`} value={form.identificacion} onChange={set('identificacion')} required placeholder="1-2345-6789" />
          </div>
          <Input
            label={`${t('register.password')} *`} type="password"
            value={form.contrasenaHash} onChange={set('contrasenaHash')}
            required minLength={6} placeholder={t('register.minChars')} hint={t('register.minChars')}
          />

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5"
            >
              {error}
            </motion.p>
          )}

          <Button type="submit" loading={loading} className="w-full" size="lg">
            {t('register.sendCode')}
          </Button>
        </form>

        <p className="text-center text-xs mt-5" style={{ color: 'var(--hc-muted)' }}>
          {t('register.alreadyAccount')}{' '}
          <Link to="/login" className="hc-underline-hover" style={{ color: 'var(--hc-accent)' }}>{t('register.login')}</Link>
        </p>
        </div>
      </motion.div>

      {/* Modal recuperar carrito abandonado */}
      <Modal open={showCartRecovery} title="¡Tenés productos guardados!">
        <div>
          <p className="text-sm text-[#8e8e9a] mb-4">
            Dejaste {recoveryCart?.items?.length ?? 0} producto(s) en tu carrito antes. ¿Querés restaurarlos?
          </p>
          <div className="space-y-2 mb-5">
            {recoveryCart?.items?.slice(0, 3).map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 py-1">
                {item.imagenUrl && (
                  <img src={item.imagenUrl} alt={item.nombre} width={32} height={32}
                    className="rounded-lg object-cover shrink-0" />
                )}
                <span className="text-sm text-[#e8e8ed] truncate flex-1">{item.nombre}</span>
                <span className="text-xs text-[#8e8e9a] shrink-0">×{item.cantidad ?? 1}</span>
              </div>
            ))}
            {(recoveryCart?.items?.length ?? 0) > 3 && (
              <p className="text-xs text-[#8e8e9a] pl-1">
                y {recoveryCart.items.length - 3} producto(s) más…
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                recoveryCart?.items?.forEach((item) =>
                  addItem({ id: item.productoId, nombre: item.nombre, precio: item.precio,
                            imagenUrl: item.imagenUrl, stock: item.stock ?? item.cantidad ?? 1 }, item.cantidad ?? 1)
                )
                try { await abandonedCartService.deleteAbandonedCart(recoveryCart.id) } catch { /* ok */ }
                setShowCartRecovery(false)
                navigate('/')
              }}
              className="flex-1 h-10 rounded-xl text-sm font-semibold bg-[#4f7cff] text-white hover:bg-[#3d6ee0] transition-colors"
            >
              Restaurar carrito
            </button>
            <button
              onClick={async () => {
                try { await abandonedCartService.deleteAbandonedCart(recoveryCart.id) } catch { /* ok */ }
                setShowCartRecovery(false)
                navigate('/')
              }}
              className="flex-1 h-10 rounded-xl text-sm border transition-colors hover:bg-white/5"
              style={{ color: 'var(--hc-muted)', borderColor: 'var(--hc-border)' }}
            >
              Descartar
            </button>
          </div>
        </div>
      </Modal>
    </AuthLayout>
  )
}
