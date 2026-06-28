import { useState, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import BrandLogo from '@/components/ui/BrandLogo'
import { getAvailableModes, MODE_PREF_KEY } from '@/utils/modes'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { authService } from '@/services/authService'
import useAuthStore from '@/store/authStore'
import useCartStore from '@/store/cartStore'
import { useToast } from '@/components/ui/Toast'
import { abandonedCartService } from '@/services/abandonedCartService'
import SocialLoginButtons from '@/components/auth/SocialLoginButtons'
import WebAuthnStep from '@/components/auth/WebAuthnStep'

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

/* accent del sitio — usa la variable CSS para respetar light/dark mode */
const A = {
  color: 'var(--hc-accent)',
  glow:  'color-mix(in srgb, var(--hc-accent) 22%, transparent)',
  bg:    'color-mix(in srgb, var(--hc-accent) 8%, transparent)',
  ring:  'color-mix(in srgb, var(--hc-accent) 32%, transparent)',
}

export default function LoginPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const login     = useAuthStore((s) => s.login)
  const toast     = useToast()
  const { t }     = useTranslation()

  const rawFrom = location.state?.from ?? '/'
  const from    = typeof rawFrom === 'string' && rawFrom.startsWith('/') && !rawFrom.startsWith('//') ? rawFrom : '/'

  const [step,              setStep]              = useState('login')
  const [loading,           setLoading]           = useState(false)
  const [correo,            setCorreo]            = useState('')
  const [contrasena,        setContrasena]        = useState('')
  const [tempToken,         setTempToken]         = useState('')
  const [code2FA,           setCode2FA]           = useState(['', '', '', '', '', ''])
  const [useRecovery,       setUseRecovery]       = useState(false)
  const [recoveryInput,     setRecoveryInput]     = useState('')
  const [showForgot,        setShowForgot]        = useState(false)
  const [showAdminModal]    = useState(false)
  const [showCartRecovery,  setShowCartRecovery]  = useState(false)
  const [recoveryCart,      setRecoveryCart]      = useState(null)
  const [recoveryDest,      setRecoveryDest]      = useState('/')
  const addItem             = useCartStore((s) => s.addItem)
  const [error,              setError]              = useState('')
  const [needsVerification,  setNeedsVerification]  = useState(false)
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false)
  const [resendLoading,      setResendLoading]      = useState(false)
  const refs2FA             = useRef([])
  // Multi-method 2FA
  const [twoFaMethods,       setTwoFaMethods]      = useState([])   // available methods
  const [resendCooldown,     setResendCooldown]    = useState(0)    // seconds until resend allowed

  const handleLogin = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const { data } = await authService.login(correo, contrasena)
      if (data.requiresWebauthn) {
        setTempToken(data.tempToken)
        setStep('webauthn')
      } else if (data.requires2fa) {
        setTempToken(data.tempToken)
        // Multiple methods → show picker
        if (data.methods && data.methods.length > 1) {
          setTwoFaMethods(data.methods)
          setStep('picker')
        } else {
          // Single method already determined
          const method = data.method || 'TOTP'
          setTwoFaMethods([method])
          if (method === 'EMAIL_OTP') {
            // Auto-send OTP email then show input
            await sendEmailOtp(data.tempToken)
            setStep('email-otp')
          } else {
            setStep('2fa')
          }
        }
      } else if (data.requiresEmpresaSelection) {
        navigate('/seleccionar-negocio', {
          replace: true,
          state: { empresas: data.empresas, tempToken: data.tempToken },
        })
      } else {
        handleLoginSuccess(data)
      }
    } catch (err) {
      const body = err.response?.data
      const msg  = typeof body?.message === 'string' ? body.message : t('login.badCredentials')
      if (err.response?.status === 403 && msg.toLowerCase().includes('verificar')) {
        setError(msg); setNeedsVerification(true)
      } else if (err.response?.status === 403 && msg.toLowerCase().includes('bloqueada')) {
        setNeedsVerification(false); setNeedsPasswordReset(true)
        setError(msg)
      } else {
        setNeedsVerification(false); setNeedsPasswordReset(false)
        setError(typeof msg === 'string' ? msg : t('login.error'))
      }
    } finally { setLoading(false) }
  }

  const handleResendVerification = async () => {
    setResendLoading(true)
    try {
      await authService.sendVerification({ correo })
      toast({ message: t('login.codeResent'), type: 'success' })
      setNeedsVerification(false); setError('')
    } catch (err) {
      const msg = err.response?.data?.message
      toast({ message: typeof msg === 'string' ? msg : t('login.resendError'), type: 'error' })
    } finally { setResendLoading(false) }
  }

  const sendEmailOtp = async (token) => {
    try {
      await authService.sendLoginEmailOtp(token || tempToken)
      startResendCooldown()
    } catch (err) {
      const msg = err.response?.data?.message
      toast({ message: typeof msg === 'string' ? msg : 'Error al enviar código', type: 'error' })
    }
  }

  const startResendCooldown = () => {
    setResendCooldown(60)
    const id = setInterval(() => {
      setResendCooldown(s => { if (s <= 1) { clearInterval(id); return 0 } return s - 1 })
    }, 1000)
  }

  const handlePickMethod = async (method) => {
    setError('')
    if (method === 'EMAIL_OTP') {
      await sendEmailOtp()
      setStep('email-otp')
    } else {
      setStep('2fa')
    }
  }

  const handle2FA = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      let data
      if (useRecovery) {
        if (!recoveryInput.trim()) { setError(t('login.recoveryCodePrompt')); setLoading(false); return }
        ;({ data } = await authService.verify2FA(tempToken, null, recoveryInput.trim()))
      } else {
        const fullCode = code2FA.join('')
        if (fullCode.length !== 6) { setError(t('login.code6digits')); setLoading(false); return }
        // Pass the selected method so the backend validates the correct factor
        ;({ data } = await authService.verify2FA(tempToken, fullCode, null, 'TOTP'))
      }
      handleLoginSuccess(data)
    } catch {
      setError(useRecovery ? t('login.invalidRecoveryCode') : t('login.error'))
      if (useRecovery) { setRecoveryInput('') }
      else { setCode2FA(['', '', '', '', '', '']); refs2FA.current[0]?.focus() }
    } finally { setLoading(false) }
  }

  const handleEmailOtp = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const fullCode = code2FA.join('')
      if (fullCode.length !== 6) { setError(t('login.code6digits')); setLoading(false); return }
      const { data } = await authService.verify2FA(tempToken, fullCode, null, 'EMAIL_OTP')
      handleLoginSuccess(data)
    } catch (err) {
      const msg = err.response?.data?.message
      setError(typeof msg === 'string' ? msg : t('login.error'))
      setCode2FA(['', '', '', '', '', '']); refs2FA.current[0]?.focus()
    } finally { setLoading(false) }
  }

  const handleLoginSuccess = async (data) => {
    login(data)
    const modes = getAvailableModes(data.rol, data.permisos ?? [])
    const isInternal = data.rol !== 'USUARIO_FINAL'
    toast({ message: isInternal ? t('login.welcomeAdmin') : t('login.welcome'), type: 'success' })

    // Usuario final: flujo habitual con recuperación de carrito
    if (!isInternal) {
      const dest = from === '/login' ? '/' : from
      try {
        const { data: res } = await abandonedCartService.getAbandonedCartBySession()
        const cart = res?.id ? res : (res?.data ?? null)
        if (cart?.items?.length > 0) {
          setRecoveryCart(cart); setRecoveryDest(dest); setShowCartRecovery(true); return
        }
      } catch { /* no cart */ }
      navigate(dest, { replace: true })
      return
    }

    // Un solo modo disponible → redirigir directo
    if (modes.length === 1) {
      navigate(modes[0].path, { replace: true })
      return
    }

    // Múltiples modos: si hay preferencia guardada usar directamente
    const savedPref = localStorage.getItem(MODE_PREF_KEY)
    if (savedPref) {
      const saved = modes.find(m => m.id === savedPref)
      if (saved) { navigate(saved.path, { replace: true }); return }
    }

    // Mostrar selector de modo
    navigate('/mode-select', { replace: true })
  }

  const handleRestoreCart = async () => {
    recoveryCart?.items?.forEach((item) =>
      addItem({ id: item.productoId, nombre: item.nombre, precio: item.precio,
                imagenUrl: item.imagenUrl, stock: item.stock ?? item.cantidad ?? 1 }, item.cantidad ?? 1)
    )
    try { await abandonedCartService.deleteAbandonedCart(recoveryCart.id) } catch { /* ok */ }
    setShowCartRecovery(false); navigate(recoveryDest, { replace: true })
  }

  const handleDiscardCart = async () => {
    try { await abandonedCartService.deleteAbandonedCart(recoveryCart.id) } catch { /* ok */ }
    setShowCartRecovery(false); navigate(recoveryDest, { replace: true })
  }

  const handle2FADigit = (idx, val) => {
    const digit = val.replace(/\D/, '').slice(-1)
    const next  = [...code2FA]; next[idx] = digit; setCode2FA(next)
    if (digit && idx < 5) refs2FA.current[idx + 1]?.focus()
  }
  const handle2FAKey  = (idx, e) => {
    if (e.key === 'Backspace' && !code2FA[idx] && idx > 0) refs2FA.current[idx - 1]?.focus()
  }
  const handle2FAPaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) { setCode2FA(text.split('')); refs2FA.current[5]?.focus() }
  }
  const verifyLabel = useRecovery ? 'Usar código de recuperación' : t('login.verify')

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: 'var(--hc-bg)' }}>

      {/* ── Fondo ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 60% 55% at 75% 30%, color-mix(in srgb, var(--hc-accent) 11%, transparent), transparent 65%)` }} />
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 45% 50% at 15% 75%, color-mix(in srgb, var(--hc-accent) 7%, transparent), transparent 65%)` }} />
      </div>
      <div className="absolute inset-0 opacity-[0.3] pointer-events-none" style={{
        backgroundImage: 'linear-gradient(var(--hc-border) 1px, transparent 1px), linear-gradient(90deg, var(--hc-border) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none">
        <span className="font-black uppercase tracking-[-0.02em] whitespace-nowrap leading-none"
          style={{ fontSize: '22vw', color: 'color-mix(in srgb, var(--hc-text) 3.5%, transparent)', transform: 'rotate(-4deg)' }}>
          ACCESO
        </span>
      </div>

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center justify-between px-5 sm:px-8 py-4 border-b"
        style={{ borderColor: 'var(--hc-border)', background: 'var(--hc-glass-bg)', backdropFilter: 'blur(16px)' }}>
        <Link to="/" className="flex items-center gap-2.5">
          <BrandLogo size={28} wordmarkSize={15} />
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm hidden sm:block" style={{ color: 'var(--hc-muted)' }}>¿Primera vez?</span>
          <Link to="/registro" className="hc-btn hc-btn-ghost hc-btn-sm">Crear cuenta</Link>
        </div>
      </header>

      {/* ── Contenido ── */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[430px]">

          {/* Badge */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="flex items-center gap-3 mb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: A.bg, border: `1px solid ${A.ring}`, color: A.color, letterSpacing: '0.06em' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: A.color }}></span>
              <span>COSTA RICA · E-COMMERCE</span>
            </div>
            <div className="h-px flex-1 max-w-[60px]" style={{ background: `linear-gradient(90deg, ${A.ring}, transparent)` }} />
          </motion.div>

          <AnimatePresence mode="wait">

            {/* ── PASO LOGIN ── */}
            {step === 'login' && (
              <motion.div key="login"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>

                {/* Headline */}
                <div className="mb-7">
                  <h1 className="font-black leading-[1.0] tracking-tight"
                    style={{ fontSize: 'clamp(2.4rem, 7vw, 3.4rem)', color: 'var(--hc-text)' }}>
                    Bienvenido
                  </h1>
                  <h1 className="font-black leading-[1.0] tracking-tight"
                    style={{ fontSize: 'clamp(2.4rem, 7vw, 3.4rem)',
                      background: `linear-gradient(120deg, ${A.color} 0%, color-mix(in srgb, ${A.color} 65%, var(--hc-blue-300)) 100%)`,
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    de vuelta
                  </h1>
                  <div className="flex items-center gap-2 mt-3">
                    <div className="w-5 h-[2px] rounded-full" style={{ background: A.color }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--hc-muted)' }}>
                      Ingresá a tu cuenta HotClick
                    </p>
                  </div>
                </div>

                {/* Form card */}
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', boxShadow: '0 4px 32px var(--hc-shadow)' }}>
                  <div className="h-[3px]" style={{ background: `linear-gradient(90deg, transparent, ${A.color}, transparent)` }} />
                  <div className="p-6 sm:p-7">
                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                      <Input label="Correo electrónico" type="email" value={correo}
                        onChange={e => setCorreo(e.target.value)} placeholder="tu@email.com"
                        required autoFocus maxLength={150} />
                      <Input label="Contraseña" type="password" value={contrasena}
                        onChange={e => setContrasena(e.target.value)} placeholder="••••••••"
                        required maxLength={128} />

                      <div className="flex justify-end -mt-1">
                        <button type="button" onClick={() => setShowForgot(true)}
                          className="text-xs transition-opacity hover:opacity-70"
                          style={{ color: A.color, background: 'none', border: 'none', cursor: 'pointer' }}>
                          ¿Olvidaste tu contraseña?
                        </button>
                      </div>

                      {error && (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                          className="flex flex-col gap-2 px-3 py-2.5 rounded-xl text-sm"
                          style={{ color: 'var(--hc-danger)', background: 'color-mix(in srgb, var(--hc-danger) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-danger) 22%, transparent)' }}>
                          {error}
                          {needsVerification && (
                            <button type="button" onClick={handleResendVerification} disabled={resendLoading}
                              style={{ textAlign: 'left', color: A.color, fontSize: 12, background: 'none', border: 'none', cursor: resendLoading ? 'not-allowed' : 'pointer', opacity: resendLoading ? 0.6 : 1 }}>
                              {resendLoading ? 'Enviando…' : 'Reenviar código de verificación →'}
                            </button>
                          )}
                          {needsPasswordReset && (
                            <button type="button" onClick={() => setShowForgot(true)}
                              style={{ textAlign: 'left', color: A.color, fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>
                              Recuperar acceso por correo →
                            </button>
                          )}
                        </motion.div>
                      )}

                      <button type="submit" disabled={loading}
                        className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl font-bold text-sm text-white w-full transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
                        style={{ background: A.color, boxShadow: `0 0 32px ${A.ring}` }}>
                        {loading ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                            Cargando…
                          </>
                        ) : <>Iniciar sesión <span className="group-hover:translate-x-1 transition-transform">→</span></>}
                      </button>
                    </form>

                    {CLERK_ENABLED && <SocialLoginButtons mode="signIn" />}

                    <p className="text-center text-sm mt-4" style={{ color: 'var(--hc-muted)' }}>
                      ¿No tenés cuenta?{' '}
                      <Link to="/registro" className="font-semibold" style={{ color: A.color }}>
                        Registrate gratis
                      </Link>
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.4 }}
                  className="mt-6 flex items-stretch rounded-2xl overflow-hidden"
                  style={{ border: '1px solid var(--hc-border)', background: 'var(--hc-surface)' }}>
                  {[
                    { icon: '🔒', val: '100%', label: 'Seguro' },
                    { icon: '🇨🇷', val: 'CR', label: 'Costa Rica' },
                    { icon: '⭐', val: '4.9', label: 'Valoración' },
                    { icon: null, val: '10K+', label: 'Productos' },
                  ].map(({ icon, val, label }, i) => (
                    <div key={label} className="flex-1 flex flex-col items-center justify-center py-3 px-2 relative">
                      {i > 0 && <div className="absolute left-0 top-2 bottom-2 w-px" style={{ background: 'var(--hc-border)' }} />}
                      <div className="text-sm font-black" style={{ color: 'var(--hc-text)', lineHeight: 1 }}>
                        {icon ? <span>{icon}</span> : val}
                      </div>
                      {icon && <div className="text-xs font-bold mt-0.5" style={{ color: A.color }}>{val}</div>}
                      <div className="text-[10px] mt-1 text-center leading-tight" style={{ color: 'var(--hc-muted)' }}>{label}</div>
                    </div>
                  ))}
                </motion.div>
              </motion.div>
            )}

            {/* ── PASO SELECTOR DE MÉTODO 2FA ── */}
            {step === 'picker' && (
              <motion.div key="picker"
                initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }}>
                <h1 className="font-black leading-[1.02] tracking-tight mb-3"
                  style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', color: 'var(--hc-text)' }}>
                  Verificación en 2 pasos
                </h1>
                <p className="text-base mb-7" style={{ color: 'var(--hc-muted)' }}>
                  ¿Cómo querés verificar tu identidad?
                </p>
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', boxShadow: '0 4px 32px var(--hc-shadow)' }}>
                  <div className="h-[3px]" style={{ background: `linear-gradient(90deg, transparent, ${A.color}, transparent)` }} />
                  <div className="p-6 flex flex-col gap-3">
                    {twoFaMethods.includes('TOTP') && (
                      <button onClick={() => handlePickMethod('TOTP')} disabled={loading}
                        className="flex items-center gap-4 p-4 rounded-xl text-left transition-all"
                        style={{ background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
                        <span style={{ fontSize: 28 }}>🔐</span>
                        <div>
                          <p className="font-bold text-sm" style={{ color: 'var(--hc-text)' }}>App de autenticación</p>
                          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Google Authenticator, Authy, etc.</p>
                        </div>
                      </button>
                    )}
                    {twoFaMethods.includes('EMAIL_OTP') && (
                      <button onClick={() => handlePickMethod('EMAIL_OTP')} disabled={loading}
                        className="flex items-center gap-4 p-4 rounded-xl text-left transition-all"
                        style={{ background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
                        <span style={{ fontSize: 28 }}>📧</span>
                        <div>
                          <p className="font-bold text-sm" style={{ color: 'var(--hc-text)' }}>Código por correo</p>
                          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Te enviamos un código a tu email</p>
                        </div>
                      </button>
                    )}
                    <button type="button" className="hc-btn hc-btn-outline w-full mt-1"
                      onClick={() => { setStep('login'); setError('') }}>
                      ← Volver
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── PASO EMAIL OTP ── */}
            {step === 'email-otp' && (
              <motion.div key="email-otp"
                initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }}>
                <h1 className="font-black leading-[1.02] tracking-tight mb-3"
                  style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', color: 'var(--hc-text)' }}>
                  Código de verificación
                </h1>
                <p className="text-base mb-7" style={{ color: 'var(--hc-muted)' }}>
                  Revisá tu correo e ingresá el código de 6 dígitos.
                </p>
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', boxShadow: '0 4px 32px var(--hc-shadow)' }}>
                  <div className="h-[3px]" style={{ background: `linear-gradient(90deg, transparent, ${A.color}, transparent)` }} />
                  <div className="p-6 sm:p-7">
                    <form onSubmit={handleEmailOtp} className="flex flex-col gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-center mb-4"
                          style={{ color: 'var(--hc-muted)' }}>Código de 6 dígitos</p>
                        <div className="flex gap-2 justify-center" onPaste={handle2FAPaste}>
                          {code2FA.map((digit, i) => (
                            <input key={i}
                              ref={el => (refs2FA.current[i] = el)}
                              type="text" inputMode="numeric" maxLength={1} value={digit}
                              onChange={e => handle2FADigit(i, e.target.value)}
                              onKeyDown={e => handle2FAKey(i, e)}
                              className="hc-input"
                              style={{ width: 46, height: 58, textAlign: 'center', fontSize: 22, fontWeight: 900, padding: 0 }}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-center mt-3" style={{ color: 'var(--hc-muted)' }}>
                          El código expira en 5 minutos.
                        </p>
                      </div>
                      {error && (
                        <div className="px-3 py-2.5 rounded-xl text-sm text-center"
                          style={{ color: 'var(--hc-danger)', background: 'color-mix(in srgb, var(--hc-danger) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-danger) 22%, transparent)' }}>
                          {error}
                        </div>
                      )}
                      <button type="submit" disabled={loading}
                        className="inline-flex items-center justify-center h-11 px-6 rounded-xl font-bold text-sm text-white w-full transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60"
                        style={{ background: A.color, boxShadow: `0 0 32px ${A.ring}` }}>
                        {loading ? 'Verificando…' : 'Verificar código'}
                      </button>
                      <button type="button" disabled={resendCooldown > 0 || loading}
                        className="hc-btn hc-btn-outline hc-btn-lg w-full disabled:opacity-40"
                        onClick={() => { setCode2FA(['', '', '', '', '', '']); sendEmailOtp() }}>
                        {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : '↻ Reenviar código'}
                      </button>
                      <button type="button" className="hc-btn hc-btn-outline w-full"
                        onClick={() => { setStep(twoFaMethods.length > 1 ? 'picker' : 'login'); setCode2FA(['', '', '', '', '', '']); setError('') }}>
                        ← Volver
                      </button>
                    </form>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── PASO WEBAUTHN ── */}
            {step === 'webauthn' && (
              <WebAuthnStep
                correo={correo}
                onSuccess={handleLoginSuccess}
                onError={(msg) => { setError(msg); setStep('login') }}
              />
            )}

            {/* ── PASO 2FA ── */}
            {step === '2fa' && (
              <motion.div key="2fa"
                initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }}>

                <h1 className="font-black leading-[1.02] tracking-tight mb-3"
                  style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', color: 'var(--hc-text)' }}>
                  {t('login.title2fa')}
                </h1>
                <p className="text-base mb-7" style={{ color: 'var(--hc-muted)' }}>{t('login.subtitle2fa')}</p>

                <div className="rounded-2xl overflow-hidden"
                  style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', boxShadow: '0 4px 32px var(--hc-shadow)' }}>
                  <div className="h-[3px]" style={{ background: `linear-gradient(90deg, transparent, ${A.color}, transparent)` }} />
                  <div className="p-6 sm:p-7">
                    <form onSubmit={handle2FA} className="flex flex-col gap-4">
                      {useRecovery ? (
                        <div>
                          <label htmlFor="login-recovery-code" className="hc-input-label block mb-2">{t('login.recoveryCodeLabel')}</label>
                          <input id="login-recovery-code" type="text" value={recoveryInput}
                            onChange={e => setRecoveryInput(e.target.value.toUpperCase())}
                            placeholder="XXXXX-XXXXX" autoFocus
                            className="hc-input w-full text-center"
                            style={{ fontFamily: 'monospace', letterSpacing: '0.2em' }} />
                          <p className="text-xs mt-1.5 text-center" style={{ color: 'var(--hc-muted)' }}>{t('login.emergencyCodeHint')}</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-center mb-4"
                            style={{ color: 'var(--hc-muted)' }}>Código de 6 dígitos</p>
                          <div className="flex gap-2 justify-center" onPaste={handle2FAPaste}>
                            {code2FA.map((digit, i) => (
                              <input key={i}
                                ref={el => (refs2FA.current[i] = el)}
                                type="text" inputMode="numeric" maxLength={1} value={digit}
                                onChange={e => handle2FADigit(i, e.target.value)}
                                onKeyDown={e => handle2FAKey(i, e)}
                                className="hc-input"
                                style={{ width: 46, height: 58, textAlign: 'center', fontSize: 22, fontWeight: 900, padding: 0 }}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {error && (
                        <div className="px-3 py-2.5 rounded-xl text-sm text-center"
                          style={{ color: 'var(--hc-danger)', background: 'color-mix(in srgb, var(--hc-danger) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-danger) 22%, transparent)' }}>
                          {error}
                        </div>
                      )}

                      <button type="submit" disabled={loading}
                        className="inline-flex items-center justify-center h-11 px-6 rounded-xl font-bold text-sm text-white w-full transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60"
                        style={{ background: A.color, boxShadow: `0 0 32px ${A.ring}` }}>
                        {loading ? 'Verificando…' : verifyLabel}
                      </button>
                      <button type="button" className="hc-btn hc-btn-outline hc-btn-lg w-full"
                        onClick={() => { setUseRecovery(p => !p); setError(''); setRecoveryInput(''); setCode2FA(['', '', '', '', '', '']) }}>
                        {useRecovery ? '← Volver a código TOTP' : '¿Perdiste tu dispositivo?'}
                      </button>
                      <button type="button" className="hc-btn hc-btn-outline w-full"
                        onClick={() => { setStep('login'); setCode2FA(['', '', '', '', '', '']); setError(''); setUseRecovery(false); setRecoveryInput('') }}>
                        ← {t('login.backToLogin')}
                      </button>
                    </form>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 text-center py-4 text-xs border-t"
        style={{ borderColor: 'var(--hc-border)', color: 'var(--hc-muted)', background: 'var(--hc-glass-bg)', backdropFilter: 'blur(8px)' }}>
        © {new Date().getFullYear()} HotClick · Costa Rica ·{' '}
        <Link to="/informacion" style={{ color: A.color }}>Términos</Link>
      </footer>

      {/* ── Modal: recuperar carrito ── */}
      <Modal open={showCartRecovery} title="¡Tenés productos guardados!">
        <div>
          <p className="text-sm mb-4" style={{ color: 'var(--hc-muted)' }}>
            Dejaste {recoveryCart?.items?.length ?? 0} producto(s) en tu carrito la última vez. ¿Querés restaurarlos?
          </p>
          <div className="space-y-2 mb-5">
            {recoveryCart?.items?.slice(0, 3).map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 py-1">
                {item.imagenUrl && <img src={item.imagenUrl} alt={item.nombre} width={32} height={32} className="rounded-lg object-cover shrink-0" />}
                <span className="text-sm truncate flex-1" style={{ color: 'var(--hc-text)' }}>{item.nombre}</span>
                <span className="text-xs shrink-0" style={{ color: 'var(--hc-muted)' }}>×{item.cantidad ?? 1}</span>
              </div>
            ))}
            {(recoveryCart?.items?.length ?? 0) > 3 && (
              <p className="text-xs pl-1" style={{ color: 'var(--hc-muted)' }}>y {recoveryCart.items.length - 3} más…</p>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleRestoreCart} className="hc-btn hc-btn-primary flex-1">Restaurar carrito</button>
            <button onClick={handleDiscardCart} className="hc-btn hc-btn-outline flex-1">Descartar</button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: admin ── */}
      <Modal open={showAdminModal} title={t('login.adminModal')}>
        <div className="space-y-3">
          <p className="text-sm mb-4" style={{ color: 'var(--hc-muted)' }}>{t('login.adminModalSub')}</p>
          {[
            { icon: '⚙', label: t('login.enterAdmin'), sub: t('login.enterAdminSub'), dest: '/admin' },
            { icon: '🛍', label: t('login.enterClient'), sub: t('login.enterClientSub'), dest: '/' },
          ].map(({ icon, label, sub, dest }) => (
            <button key={dest} onClick={() => { setShowAdminModal(false); navigate(dest) }}
              className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-colors hover:bg-[color-mix(in_srgb,var(--hc-accent)_5%,transparent)]"
              style={{ background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--hc-surface-3)', fontSize: '1.1rem' }}>{icon}</div>
              <div>
                <div className="font-semibold text-sm" style={{ color: 'var(--hc-text)' }}>{label}</div>
                <div className="text-xs" style={{ color: 'var(--hc-muted)' }}>{sub}</div>
              </div>
            </button>
          ))}
        </div>
      </Modal>

      <ForgotPasswordModal open={showForgot} onClose={() => setShowForgot(false)} />
    </div>
  )
}

/* ══════════════════════════════════════════ */
function ForgotPasswordModal({ open, onClose }) {
  const [step,    setStep]    = useState('email')
  const [correo,  setCorreo]  = useState('')
  const [codigo,  setCodigo]  = useState('')
  const [nueva,   setNueva]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const toast = useToast()
  const { t } = useTranslation()

  const handleEmail = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      await authService.forgotPassword(correo)
      toast({ message: t('forgot.codeSent'), type: 'success' }); setStep('code')
    } catch (err) {
      const msg = err.response?.data?.message
      setError(typeof msg === 'string' && msg ? msg : t('forgot.emailNotFound'))
    } finally { setLoading(false) }
  }

  const handleCode = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      await authService.verifyCode(correo, codigo); setStep('password')
    } catch (err) {
      const msg = err.response?.data?.message
      setError(typeof msg === 'string' && msg ? msg : t('forgot.badCode'))
    } finally { setLoading(false) }
  }

  const handlePassword = async (e) => {
    e.preventDefault()
    if (nueva.length < 6) { setError(t('forgot.minChars')); return }
    setError(''); setLoading(true)
    try {
      await authService.resetPassword(correo, nueva)
      toast({ message: t('forgot.passwordChanged'), type: 'success' })
      onClose(); setStep('email'); setCorreo(''); setCodigo(''); setNueva('')
    } catch { setError(t('forgot.errorChange')) }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={() => { onClose(); setStep('email'); setError('') }} title={t('forgot.title')}>
      {step === 'email' && (
        <form onSubmit={handleEmail} className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>{t('forgot.emailStep')}</p>
          <Input label={t('forgot.emailLabel')} type="email" value={correo} onChange={e => setCorreo(e.target.value)} required />
          {error && <p className="text-sm" style={{ color: 'var(--hc-danger)' }}>{error}</p>}
          <button type="submit" disabled={loading} className="hc-btn hc-btn-primary hc-btn-lg w-full disabled:opacity-60">
            {loading ? 'Enviando…' : t('forgot.sendCode')}
          </button>
        </form>
      )}
      {step === 'code' && (
        <form onSubmit={handleCode} className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>{t('forgot.codeStep')} <strong style={{ color: 'var(--hc-text)' }}>{correo}</strong></p>
          <Input label={t('forgot.codeLabel')} value={codigo} onChange={e => setCodigo(e.target.value)} required maxLength={6} />
          {error && <p className="text-sm" style={{ color: 'var(--hc-danger)' }}>{error}</p>}
          <button type="submit" disabled={loading} className="hc-btn hc-btn-primary hc-btn-lg w-full disabled:opacity-60">
            {loading ? 'Verificando…' : t('forgot.codeVerify')}
          </button>
        </form>
      )}
      {step === 'password' && (
        <form onSubmit={handlePassword} className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>{t('forgot.passwordStep')}</p>
          <Input label={t('forgot.newPassword')} type="password" value={nueva} onChange={e => setNueva(e.target.value)} required minLength={6} />
          {error && <p className="text-sm" style={{ color: 'var(--hc-danger)' }}>{error}</p>}
          <button type="submit" disabled={loading} className="hc-btn hc-btn-primary hc-btn-lg w-full disabled:opacity-60">
            {loading ? 'Guardando…' : t('forgot.changePassword')}
          </button>
        </form>
      )}
    </Modal>
  )
}
