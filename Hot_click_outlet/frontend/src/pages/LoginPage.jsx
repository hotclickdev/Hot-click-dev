import { useState, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { getAvailableModes, MODE_PREF_KEY } from '@/utils/modes'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/ui/Modal'
import { authService } from '@/services/authService'
import useAuthStore from '@/store/authStore'
import useCartStore from '@/store/cartStore'
import { useToast } from '@/components/ui/Toast'
import { abandonedCartService } from '@/services/abandonedCartService'
import WebAuthnStep from '@/components/auth/WebAuthnStep'
import ForgotPasswordModal from './auth/ForgotPasswordModal'
import { destinoPostLogin, mensajeErrorAuth } from './auth/authHelpers'
import { A } from './auth/authUi'
import LoginHeader from './auth/LoginHeader'
import LoginFormStep from './auth/LoginFormStep'
import TwoFaPickerStep from './auth/TwoFaPickerStep'
import TwoFaEmailOtpStep from './auth/TwoFaEmailOtpStep'
import TwoFaTotpStep from './auth/TwoFaTotpStep'
import CartModal from './auth/CartModal'

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

export default function LoginPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const login     = useAuthStore((s) => s.login)
  const toast     = useToast()
  const { t }     = useTranslation()

  const from = destinoPostLogin(location.state?.from ?? '/')

  const [step,              setStep]              = useState('login')
  const [loading,           setLoading]           = useState(false)
  const [correo,            setCorreo]            = useState('')
  const [contrasena,        setContrasena]        = useState('')
  const [tempToken,         setTempToken]         = useState('')
  const [code2FA,           setCode2FA]           = useState(['', '', '', '', '', ''])
  const [useRecovery,       setUseRecovery]       = useState(false)
  const [recoveryInput,     setRecoveryInput]     = useState('')
  const [showForgot,        setShowForgot]        = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [showCartRecovery,  setShowCartRecovery]  = useState(false)
  const [recoveryCart,      setRecoveryCart]      = useState(null)
  const [recoveryDest,      setRecoveryDest]      = useState('/')
  const addItem             = useCartStore((s) => s.addItem)
  const [error,              setError]              = useState('')
  const [needsVerification,  setNeedsVerification]  = useState(false)
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false)
  const [resendLoading,      setResendLoading]      = useState(false)
  const refs2FA             = useRef([])
  const turnstileRef        = useRef(null)
  const [turnstileToken,    setTurnstileToken]     = useState('')
  // Multi-method 2FA
  const [twoFaMethods,       setTwoFaMethods]      = useState([])   // available methods
  const [resendCooldown,     setResendCooldown]    = useState(0)    // seconds until resend allowed

  const handleLogin = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const { data } = await authService.login(correo, contrasena, turnstileToken)
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
      const msg = mensajeErrorAuth(err, t('login.badCredentials'))
      if (err.response?.status === 403 && msg.toLowerCase().includes('verificar')) {
        setError(msg); setNeedsVerification(true)
      } else if (err.response?.status === 403 && msg.toLowerCase().includes('bloqueada')) {
        setNeedsVerification(false); setNeedsPasswordReset(true)
        setError(msg)
      } else {
        setNeedsVerification(false); setNeedsPasswordReset(false)
        setError(typeof msg === 'string' ? msg : t('login.error'))
      }
      turnstileRef.current?.reset()
      setTurnstileToken('')
    } finally { setLoading(false) }
  }

  const handleResendVerification = async () => {
    setResendLoading(true)
    try {
      await authService.sendVerification({ correo })
      toast({ message: t('login.codeResent'), type: 'success' })
      setNeedsVerification(false); setError('')
    } catch (err) {
      toast({ message: mensajeErrorAuth(err, t('login.resendError')), type: 'error' })
    } finally { setResendLoading(false) }
  }

  const sendEmailOtp = async (token) => {
    try {
      await authService.sendLoginEmailOtp(token || tempToken)
      startResendCooldown()
    } catch (err) {
      toast({ message: mensajeErrorAuth(err, 'Error al enviar código'), type: 'error' })
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
      setError(mensajeErrorAuth(err, t('login.error')))
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

    // Múltiples modos: si hay preferencia guardada usar directamente.
    // EMPRENDEDOR queda excluido: el rol "dueño de negocio" siempre debe ver
    // el selector de modo (Sistema/Caja) tras cada login, como en el mockup
    // aprobado — a diferencia de ADMIN/GERENTE/SUPERVISOR, no tiene un
    // switcher visible dentro del panel para volver a cambiarlo.
    if (data.rol !== 'EMPRENDEDOR') {
      const savedPref = localStorage.getItem(MODE_PREF_KEY)
      if (savedPref) {
        const saved = modes.find(m => m.id === savedPref)
        if (saved) { navigate(saved.path, { replace: true }); return }
      }
    }

    // Mostrar selector de modo
    navigate('/mode-select', { replace: true })
  }

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

      <LoginHeader />

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[430px]">

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

            {step === 'login' && (
              <LoginFormStep
                key="login"
                correo={correo} setCorreo={setCorreo}
                contrasena={contrasena} setContrasena={setContrasena}
                error={error} needsVerification={needsVerification}
                needsPasswordReset={needsPasswordReset}
                resendLoading={resendLoading} loading={loading}
                turnstileToken={turnstileToken} turnstileRef={turnstileRef}
                turnstileSiteKey={TURNSTILE_SITE_KEY} clerkEnabled={CLERK_ENABLED}
                setTurnstileToken={setTurnstileToken}
                onSubmit={handleLogin}
                onResendVerification={handleResendVerification}
                onForgot={() => setShowForgot(true)}
              />
            )}

            {step === 'picker' && (
              <TwoFaPickerStep
                key="picker"
                methods={twoFaMethods}
                loading={loading}
                onPick={handlePickMethod}
                onBack={() => { setStep('login'); setError('') }}
              />
            )}

            {step === 'email-otp' && (
              <TwoFaEmailOtpStep
                key="email-otp"
                code2FA={code2FA} refs2FA={refs2FA} onCodeChange={setCode2FA}
                error={error} loading={loading} resendCooldown={resendCooldown}
                onSubmit={handleEmailOtp}
                onResend={() => { setCode2FA(['', '', '', '', '', '']); sendEmailOtp() }}
                onBack={() => { setStep(twoFaMethods.length > 1 ? 'picker' : 'login'); setCode2FA(['', '', '', '', '', '']); setError('') }}
              />
            )}

            {step === 'webauthn' && (
              <WebAuthnStep
                correo={correo}
                onSuccess={handleLoginSuccess}
                onError={(msg) => { setError(msg); setStep('login') }}
              />
            )}

            {step === '2fa' && (
              <TwoFaTotpStep
                key="2fa"
                useRecovery={useRecovery}
                recoveryInput={recoveryInput} onRecoveryInput={setRecoveryInput}
                code2FA={code2FA} refs2FA={refs2FA} onCodeChange={setCode2FA}
                error={error} loading={loading}
                onSubmit={handle2FA}
                onToggleRecovery={() => { setUseRecovery(p => !p); setError(''); setRecoveryInput(''); setCode2FA(['', '', '', '', '', '']) }}
                onBack={() => { setStep('login'); setCode2FA(['', '', '', '', '', '']); setError(''); setUseRecovery(false); setRecoveryInput('') }}
              />
            )}

          </AnimatePresence>
        </div>
      </main>

      <footer className="relative z-10 text-center py-4 text-xs border-t"
        style={{ borderColor: 'var(--hc-border)', color: 'var(--hc-muted)', background: 'var(--hc-glass-bg)', backdropFilter: 'blur(8px)' }}>
        © {new Date().getFullYear()} HotClick · Costa Rica ·{' '}
        <Link to="/informacion" style={{ color: A.color }}>Términos</Link>
      </footer>

      <CartModal
        open={showCartRecovery}
        cart={recoveryCart}
        addItem={addItem}
        onClose={() => setShowCartRecovery(false)}
        onDone={() => navigate(recoveryDest, { replace: true })}
      />

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
