import { useState, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import AuthLayout from '@/layouts/AuthLayout'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { authService } from '@/services/authService'
import useAuthStore from '@/store/authStore'
import { useToast } from '@/components/ui/Toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuthStore((s) => s.login)
  const toast = useToast()
  const { t } = useTranslation()
  const from = location.state?.from || '/'

  const [step, setStep] = useState('login') // 'login' | '2fa'
  const [loading, setLoading] = useState(false)
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [tempToken, setTempToken] = useState('')
  const [code2FA, setCode2FA] = useState(['', '', '', '', '', ''])
  const [showForgot, setShowForgot] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [loginData, setLoginData] = useState(null)
  const [error, setError] = useState('')
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const refs2FA = useRef([])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await authService.login(correo, contrasena)
      // Backend devuelve { requires2fa: true, tempToken } si tiene 2FA
      if (data.requires2fa) {
        setTempToken(data.tempToken)
        setStep('2fa')
      } else {
        handleLoginSuccess(data)
      }
    } catch (err) {
      const body = err.response?.data
      const msg = typeof body?.message === 'string' ? body.message : t('login.badCredentials')
      if (err.response?.status === 403 && msg.toLowerCase().includes('verificar')) {
        setError(msg)
        setNeedsVerification(true)
      } else {
        setNeedsVerification(false)
        setError(typeof msg === 'string' ? msg : t('login.error'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    setResendLoading(true)
    try {
      await authService.sendVerification({ correo })
      toast({ message: 'Código reenviado. Revisá tu correo y completá el registro.', type: 'success' })
      setNeedsVerification(false)
      setError('')
    } catch (err) {
      const msg = err.response?.data?.message
      toast({ message: typeof msg === 'string' ? msg : 'Error al reenviar el código.', type: 'error' })
    } finally {
      setResendLoading(false)
    }
  }

  const handle2FA = async (e) => {
    e.preventDefault()
    const fullCode = code2FA.join('')
    if (fullCode.length !== 6) { setError(t('login.code6digits')); return }
    setError('')
    setLoading(true)
    try {
      const { data } = await authService.verify2FA(tempToken, fullCode)
      handleLoginSuccess(data)
    } catch {
      setError(t('login.error'))
      setCode2FA(['', '', '', '', '', ''])
      refs2FA.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  // data = JwtResponse: { token, tipo, id, correo, rol }
  const handleLoginSuccess = (data) => {
    login(data)
    const isAdmin = ['ADMIN_IT', 'ADMIN_CLIENTE'].includes(data.rol)
    toast({ message: isAdmin ? t('login.welcomeAdmin') : t('login.welcome'), type: 'success' })
    if (isAdmin) {
      setLoginData(data)
      setShowAdminModal(true)
    } else {
      navigate(from === '/login' ? '/' : from, { replace: true })
    }
  }

  const handle2FADigit = (idx, val) => {
    const digit = val.replace(/\D/, '').slice(-1)
    const next = [...code2FA]
    next[idx] = digit
    setCode2FA(next)
    if (digit && idx < 5) refs2FA.current[idx + 1]?.focus()
  }

  const handle2FAKey = (idx, e) => {
    if (e.key === 'Backspace' && !code2FA[idx] && idx > 0) {
      refs2FA.current[idx - 1]?.focus()
    }
  }

  const handle2FAPaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      setCode2FA(text.split(''))
      refs2FA.current[5]?.focus()
    }
  }

  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', boxShadow: '0 24px 64px color-mix(in srgb, var(--hc-shadow) 60%, transparent)' }}
      >
        {/* Accent line */}
        <div className="h-0.5 text-gradient-accent"
          style={{ background: 'linear-gradient(90deg, transparent, var(--hc-accent), color-mix(in srgb, var(--hc-accent) 60%, #a78bfa), transparent)' }} />
        <div className="p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--hc-text)' }}>
            {step === '2fa' ? t('login.title2fa') : t('login.title')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
            {step === '2fa'
              ? t('login.subtitle2fa')
              : t('login.subtitle')
            }
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'login' && (
            <motion.form
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleLogin}
              className="space-y-4"
            >
              <Input
                label={t('login.email')}
                type="email"
                placeholder={t('login.emailPlaceholder')}
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                required
                autoFocus
                icon={<EmailIcon />}
              />
              <Input
                label={t('login.password')}
                type="password"
                placeholder="••••••••"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                required
                icon={<LockIcon />}
              />

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 space-y-2"
                >
                  <p>{error}</p>
                  {needsVerification && (
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={resendLoading}
                      className="text-[#4f7cff] hover:underline text-xs disabled:opacity-50"
                    >
                      {resendLoading ? 'Enviando...' : 'Reenviar código de verificación →'}
                    </button>
                  )}
                </motion.div>
              )}

              <Button type="submit" loading={loading} className="w-full" size="lg">
                {t('login.submit')}
              </Button>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-xs text-[#8e8e9a] hover:text-[#4f7cff] transition-colors"
                >
                  {t('login.forgotPassword')}
                </button>
                <Link to="/registro" className="text-xs text-[#4f7cff] hover:text-[#3d6ee0] transition-colors">
                  {t('login.createAccount')}
                </Link>
              </div>
            </motion.form>
          )}

          {step === '2fa' && (
            <motion.form
              key="2fa"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              onSubmit={handle2FA}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium text-[#e8e8ed] mb-3 text-center">
                  {t('login.code6digits')}
                </label>
                <div className="flex gap-2 justify-center" onPaste={handle2FAPaste}>
                  {code2FA.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => (refs2FA.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handle2FADigit(i, e.target.value)}
                      onKeyDown={(e) => handle2FAKey(i, e)}
                      className={`
                        w-11 h-14 text-center text-xl font-bold
                        bg-white/5 border rounded-xl
                        text-[#e8e8ed] transition-all duration-200
                        focus:outline-none focus:border-[#4f7cff]/60 focus:ring-2 focus:ring-[#4f7cff]/15
                        ${digit ? 'border-white/20' : 'border-white/8'}
                      `}
                    />
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-400 text-center bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
                  {error}
                </p>
              )}

              <div className="space-y-2">
                <Button type="submit" loading={loading} className="w-full" size="lg">
                  {t('login.verify')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  className="w-full"
                  onClick={() => { setStep('login'); setCode2FA(['','','','','','']); setError('') }}
                >
                  {t('login.backToLogin')}
                </Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {step === 'login' && (
          <p className="text-center text-xs mt-6" style={{ color: 'var(--hc-muted)' }}>
            {t('login.noAccount')}{' '}
            <Link to="/registro" className="hc-underline-hover" style={{ color: 'var(--hc-accent)' }}>
              {t('login.register')}
            </Link>
          </p>
        )}
        </div>
      </motion.div>

      {/* Modal selección modo admin */}
      <Modal open={showAdminModal} title={t('login.adminModal')}>
        <div className="space-y-3">
          <p className="text-sm text-[#8e8e9a] mb-4">
            {t('login.adminModalSub')}
          </p>
          <button
            onClick={() => { setShowAdminModal(false); navigate('/admin') }}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-[#4f7cff]/10 border border-[#4f7cff]/20 hover:bg-[#4f7cff]/15 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#4f7cff]/20 flex items-center justify-center shrink-0">
              <span className="text-[#4f7cff] text-lg">⚙</span>
            </div>
            <div>
              <div className="font-medium text-[#e8e8ed] text-sm">{t('login.enterAdmin')}</div>
              <div className="text-xs text-[#8e8e9a]">{t('login.enterAdminSub')}</div>
            </div>
          </button>
          <button
            onClick={() => { setShowAdminModal(false); navigate('/') }}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/8 hover:bg-white/8 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center shrink-0">
              <span className="text-[#e8e8ed] text-lg">🛍</span>
            </div>
            <div>
              <div className="font-medium text-[#e8e8ed] text-sm">{t('login.enterClient')}</div>
              <div className="text-xs text-[#8e8e9a]">{t('login.enterClientSub')}</div>
            </div>
          </button>
        </div>
      </Modal>

      <ForgotPasswordModal open={showForgot} onClose={() => setShowForgot(false)} />
    </AuthLayout>
  )
}

function ForgotPasswordModal({ open, onClose }) {
  const [step, setStep] = useState('email')
  const [correo, setCorreo] = useState('')
  const [codigo, setCodigo] = useState('')
  const [nueva, setNueva] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()
  const { t } = useTranslation()

  const handleEmail = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authService.forgotPassword(correo)
      toast({ message: t('forgot.codeSent'), type: 'success' })
      setStep('code')
    } catch (err) {
      const msg = err.response?.data?.message
      setError(typeof msg === 'string' && msg ? msg : t('forgot.emailNotFound'))
    } finally { setLoading(false) }
  }

  const handleCode = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authService.verifyCode(correo, codigo)
      setStep('password')
    } catch (err) {
      const msg = err.response?.data?.message
      setError(typeof msg === 'string' && msg ? msg : t('forgot.badCode'))
    } finally { setLoading(false) }
  }

  const handlePassword = async (e) => {
    e.preventDefault()
    if (nueva.length < 6) { setError(t('forgot.minChars')); return }
    setError('')
    setLoading(true)
    try {
      await authService.resetPassword(correo, nueva)
      toast({ message: t('forgot.passwordChanged'), type: 'success' })
      onClose()
      setStep('email'); setCorreo(''); setCodigo(''); setNueva('')
    } catch { setError(t('forgot.errorChange')) }
    finally { setLoading(false) }
  }

  const reset = () => { setStep('email'); setError('') }

  return (
    <Modal open={open} onClose={() => { onClose(); reset() }} title={t('forgot.title')}>
      {step === 'email' && (
        <form onSubmit={handleEmail} className="space-y-4">
          <p className="text-sm text-[#8e8e9a]">{t('forgot.emailStep')}</p>
          <Input label={t('forgot.emailLabel')} type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">{t('forgot.sendCode')}</Button>
        </form>
      )}
      {step === 'code' && (
        <form onSubmit={handleCode} className="space-y-4">
          <p className="text-sm text-[#8e8e9a]">{t('forgot.codeStep')} <strong className="text-[#e8e8ed]">{correo}</strong></p>
          <Input label={t('forgot.codeLabel')} value={codigo} onChange={(e) => setCodigo(e.target.value)} required maxLength={6} />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">{t('forgot.codeVerify')}</Button>
        </form>
      )}
      {step === 'password' && (
        <form onSubmit={handlePassword} className="space-y-4">
          <p className="text-sm text-[#8e8e9a]">{t('forgot.passwordStep')}</p>
          <Input label={t('forgot.newPassword')} type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} required minLength={6} />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">{t('forgot.changePassword')}</Button>
        </form>
      )}
    </Modal>
  )
}

function EmailIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
}

function LockIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
}
