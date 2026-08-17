import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BrandLogo from '@/components/ui/BrandLogo'
import { motion, AnimatePresence } from 'framer-motion'
import SocialLoginButtons from '@/components/auth/SocialLoginButtons'
import { useTranslation } from 'react-i18next'
import PhoneField from '@/components/ui/PhoneField'
import Input from '@/components/ui/Input'
import { authService } from '@/services/authService'
import { useToast } from '@/components/ui/Toast'
import useAuthStore from '@/store/authStore'
import useCartStore from '@/store/cartStore'
import { abandonedCartService } from '@/services/abandonedCartService'
import CartModal from './auth/CartModal'
import EmprendimientoCloud from './auth/EmprendimientoCloud'
import EmprendimientoForm from './auth/EmprendimientoForm'
import { mensajeErrorAuth } from './auth/authHelpers'

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const BUYER = {
  color: 'var(--hc-accent)',
  glow:  'color-mix(in srgb, var(--hc-accent) 22%, transparent)',
  bg:    'color-mix(in srgb, var(--hc-accent) 8%, transparent)',
  ring:  'color-mix(in srgb, var(--hc-accent) 32%, transparent)',
}

export default function RegisterPage() {
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

  /* ═══ VERIFICACIÓN ═══════════════════════════════════════════ */
  if (step === 'verify') {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden"
        style={{ background: 'var(--hc-bg)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 60% 55% at 50% 30%, ${BUYER.glow}, transparent 65%)` }} />
        </div>
        <div className="absolute inset-0 opacity-[0.35] pointer-events-none" style={{
          backgroundImage: 'linear-gradient(var(--hc-border) 1px, transparent 1px), linear-gradient(90deg, var(--hc-border) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none">
          <span className="font-black uppercase tracking-[-0.02em] whitespace-nowrap leading-none"
            style={{ fontSize: '20vw', color: 'color-mix(in srgb, var(--hc-text) 4%, transparent)' }}>CÓDIGO</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-[420px]">

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold mb-5 w-fit"
            style={{ background: BUYER.bg, border: `1px solid ${BUYER.ring}`, color: BUYER.color }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: BUYER.color }}></span>
            <span>Verificación de cuenta</span>
          </div>

          <h1 className="font-black leading-[1.02] tracking-tight mb-2"
            style={{ fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', color: 'var(--hc-text)' }}>
            {t('register.verifyTitle')}
          </h1>
          <p className="text-base mb-6" style={{ color: 'var(--hc-muted)' }}>
            {t('register.verifyCodeSent')}{' '}
            <span className="font-semibold" style={{ color: 'var(--hc-text)' }}>{correoRegistro}</span>
          </p>

          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', boxShadow: '0 4px 32px var(--hc-shadow)' }}>
            <div className="h-[3px]" style={{ background: `linear-gradient(90deg, transparent, ${BUYER.color}, transparent)` }} />
            <div className="p-6 sm:p-7">
              <div className="flex items-start gap-2.5 rounded-xl px-3 py-2.5 mb-5"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <svg className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--hc-warning)' }}>
                  <span className="font-semibold">Este código es solo para verificar tu cuenta.</span>{' '}No lo compartas con nadie.
                </p>
              </div>

              <form onSubmit={handleVerify} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="reg-codigo-email" className="hc-input-label block mb-2">{t('register.verificationCode')}</label>
                  <input id="reg-codigo-email" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                    value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000" autoFocus className="hc-input w-full text-center"
                    style={{ fontSize: 32, fontWeight: 900, letterSpacing: '0.55em', height: 64, padding: '0 12px' }} />
                  <p className="text-xs text-center mt-2" style={{ color: 'var(--hc-muted)' }}>
                    Ingresá los 6 dígitos que llegaron a tu correo
                  </p>
                </div>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-sm rounded-xl px-3 py-2.5"
                    style={{ color: 'var(--hc-danger)', background: 'color-mix(in srgb, var(--hc-danger) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-danger) 20%, transparent)' }}>
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {error}
                  </motion.div>
                )}
                <button type="submit" disabled={loading}
                  className="inline-flex items-center justify-center h-11 px-6 rounded-xl font-bold text-sm text-white w-full transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60"
                  style={{ background: BUYER.color, boxShadow: `0 0 32px ${BUYER.ring}` }}>
                  {loading ? 'Verificando…' : t('register.verifyBtn')}
                </button>
              </form>

              <div className="mt-5 text-center flex flex-col gap-2">
                <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                  {t('register.noEmail')}{' '}
                  <button onClick={handleReenviar} disabled={loading}
                    className="font-semibold disabled:opacity-50"
                    style={{ color: BUYER.color, background: 'none', border: 'none', cursor: 'pointer' }}>
                    {t('register.resend')}
                  </button>
                </p>
                <button onClick={() => { setStep('form'); setError('') }}
                  className="text-xs" style={{ color: 'var(--hc-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  ← {t('register.backToForm')}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        <CartModal open={showCartRecovery} cart={recoveryCart} addItem={addItem}
          onClose={() => setShowCartRecovery(false)} onDone={() => navigate('/')} />
      </div>
    )
  }

  /* ═══ FORMULARIO ════════════════════════════════════════════ */
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: 'var(--hc-bg)' }}>

      {/* Fondo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 50% 45% at 80% 20%, color-mix(in srgb, var(--hc-accent) 10%, transparent), transparent 65%)` }} />
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 35% 40% at 5% 80%, rgba(245,158,11,0.08), transparent 65%)` }} />
      </div>
      <div className="absolute inset-0 opacity-[0.35] pointer-events-none" style={{
        backgroundImage: 'linear-gradient(var(--hc-border) 1px, transparent 1px), linear-gradient(90deg, var(--hc-border) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none">
        <span className="font-black uppercase tracking-[-0.02em] whitespace-nowrap leading-none"
          style={{ fontSize: '18vw', color: 'color-mix(in srgb, var(--hc-text) 4%, transparent)', transform: 'rotate(-3deg)' }}>
          REGISTRO
        </span>
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 sm:px-8 py-4 border-b"
        style={{ borderColor: 'var(--hc-border)', background: 'var(--hc-glass-bg)', backdropFilter: 'blur(16px)' }}>
        <Link to="/" className="flex items-center gap-2.5">
          <BrandLogo size={28} wordmarkSize={15} />
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm hidden sm:block" style={{ color: 'var(--hc-muted)' }}>¿Ya tenés cuenta?</span>
          <Link to="/login" className="hc-btn hc-btn-ghost hc-btn-sm">Iniciar sesión</Link>
        </div>
      </header>

      {/* Contenido */}
      <main className="relative z-10 flex-1 px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-5xl mx-auto">
          <AnimatePresence mode="wait">

            {/* ── MODO COMPRADOR ── */}
            {modo === 'comprador' && (
              <motion.div key="comprador"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">

                {/* Columna izquierda */}
                <div>
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                    className="flex items-center gap-3 mb-5">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
                      style={{ background: BUYER.bg, border: `1px solid ${BUYER.ring}`, color: BUYER.color, letterSpacing: '0.06em' }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: BUYER.color }}></span>
                      <span>Creá tu cuenta gratis</span>
                    </div>
                    <div className="h-px flex-1 max-w-[60px]" style={{ background: `linear-gradient(90deg, ${BUYER.ring}, transparent)` }} />
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }} className="mb-6">
                    <h1 className="font-black leading-[1.0] tracking-tight" style={{ fontSize: 'clamp(2.2rem, 5vw, 3rem)', color: 'var(--hc-text)' }}>
                      {t('register.title')}
                    </h1>
                    <h1 className="font-black leading-[1.0] tracking-tight"
                      style={{ fontSize: 'clamp(2.2rem, 5vw, 3rem)',
                        background: `linear-gradient(120deg, ${BUYER.color} 0%, color-mix(in srgb, ${BUYER.color} 65%, var(--hc-blue-300)) 100%)`,
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                      en HotClick
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-5 h-[2px] rounded-full" style={{ background: BUYER.color }} />
                      <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>{t('register.subtitle')}</p>
                    </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className="rounded-2xl overflow-hidden"
                    style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', boxShadow: '0 4px 32px var(--hc-shadow)' }}>
                    <div className="h-[3px]" style={{ background: `linear-gradient(90deg, transparent, ${BUYER.color}, transparent)` }} />
                    <div className="p-5 sm:p-7">
                      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-3">
                          <Input label={`${t('register.name')} *`} value={form.nombre} onChange={actualizarCampo('nombre')} required placeholder="Juan" maxLength={100} />
                          <Input label={`${t('register.lastName')} *`} value={form.apellidoPaterno} onChange={actualizarCampo('apellidoPaterno')} required placeholder="Pérez" maxLength={100} />
                        </div>
                        <Input label={t('register.motherLastName')} value={form.apellidoMaterno} onChange={actualizarCampo('apellidoMaterno')} placeholder={t('common.optional')} maxLength={100} />
                        <Input label={`${t('register.email')} *`} type="email" value={form.correo} onChange={actualizarCampo('correo')} required placeholder="tu@email.com" maxLength={150} />
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1.5">
                            <label className="hc-input-label">{t('register.phone')}</label>
                            <PhoneField value={form.telefono} onChange={(val) => setForm(f => ({ ...f, telefono: val }))} required />
                          </div>
                          <Input label={`${t('register.identification')} *`} value={form.identificacion} onChange={actualizarCampo('identificacion')} required placeholder="1-2345-6789" maxLength={20} />
                        </div>
                        <Input label={`${t('register.password')} *`} type="password"
                          value={form.contrasenaHash} onChange={actualizarCampo('contrasenaHash')}
                          required minLength={8} maxLength={128} placeholder="Mínimo 8 caracteres" hint="Mínimo 8 caracteres" />
                        {error && (
                          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                            className="text-sm rounded-xl px-3 py-2.5"
                            style={{ color: 'var(--hc-danger)', background: 'color-mix(in srgb, var(--hc-danger) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-danger) 20%, transparent)' }}>
                            {error}
                          </motion.div>
                        )}
                        <button type="submit" disabled={loading}
                          className="group inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl font-bold text-sm text-white w-full transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
                          style={{ background: BUYER.color, boxShadow: `0 0 32px ${BUYER.ring}` }}>
                          {loading ? 'Enviando código…' : <>{t('register.sendCode')} <span className="group-hover:translate-x-1 transition-transform">→</span></>}
                        </button>
                      </form>
                      {CLERK_ENABLED && <SocialLoginButtons mode="signUp" />}
                      <p className="text-center text-sm mt-4" style={{ color: 'var(--hc-muted)' }}>
                        {t('register.alreadyAccount')}{' '}
                        <Link to="/login" className="font-semibold" style={{ color: BUYER.color }}>{t('register.login')}</Link>
                      </p>
                    </div>
                  </motion.div>
                </div>

                {/* Columna derecha — cloud */}
                <div>
                  <EmprendimientoCloud onRegistrar={() => { setModo('emprendedor'); setError('') }} />
                </div>
              </motion.div>
            )}

            {/* ── MODO EMPRENDEDOR ── */}
            {modo === 'emprendedor' && (
              <motion.div key="emprendedor"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}
                className="max-w-[460px] mx-auto">
                <EmprendimientoForm onVolver={() => { setModo('comprador'); setError('') }} />
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      <CartModal open={showCartRecovery} cart={recoveryCart} addItem={addItem}
        onClose={() => setShowCartRecovery(false)} onDone={() => navigate('/')} />
    </div>
  )
}
