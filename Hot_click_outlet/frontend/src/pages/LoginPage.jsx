import { useState, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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
      const msg = body?.message || body || 'Credenciales incorrectas'
      if (err.response?.status === 403) {
        setError('Tu cuenta está pendiente de aprobación por el administrador.')
      } else {
        setError(typeof msg === 'string' ? msg : 'Error al iniciar sesión')
      }
    } finally {
      setLoading(false)
    }
  }

  const handle2FA = async (e) => {
    e.preventDefault()
    const fullCode = code2FA.join('')
    if (fullCode.length !== 6) { setError('Ingresa el código de 6 dígitos'); return }
    setError('')
    setLoading(true)
    try {
      const { data } = await authService.verify2FA(tempToken, fullCode)
      handleLoginSuccess(data)
    } catch {
      setError('Código incorrecto. Intenta de nuevo.')
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
    toast({ message: `¡Bienvenido${isAdmin ? ', Admin' : ''}!`, type: 'success' })
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
      <div className="bg-[#111114] border border-white/8 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#e8e8ed] mb-2">
            {step === '2fa' ? 'Verificación 2FA' : 'Bienvenido de vuelta'}
          </h1>
          <p className="text-sm text-[#8e8e9a]">
            {step === '2fa'
              ? 'Ingresa el código de tu app autenticadora'
              : 'Inicia sesión en tu cuenta HOTCLICK'
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
                label="Correo electrónico"
                type="email"
                placeholder="tu@email.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                required
                autoFocus
                icon={<EmailIcon />}
              />
              <Input
                label="Contraseña"
                type="password"
                placeholder="••••••••"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                required
                icon={<LockIcon />}
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
                Iniciar sesión
              </Button>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-xs text-[#8e8e9a] hover:text-[#4f7cff] transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
                <Link to="/registro" className="text-xs text-[#4f7cff] hover:text-[#3d6ee0] transition-colors">
                  Crear cuenta
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
                  Código de 6 dígitos
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
                  Verificar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  className="w-full"
                  onClick={() => { setStep('login'); setCode2FA(['','','','','','']); setError('') }}
                >
                  ← Volver al login
                </Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {step === 'login' && (
          <p className="text-center text-xs text-[#8e8e9a] mt-6">
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="text-[#4f7cff] hover:underline">
              Regístrate gratis
            </Link>
          </p>
        )}
      </div>

      {/* Modal selección modo admin */}
      <Modal open={showAdminModal} title="Seleccionar modo de acceso">
        <div className="space-y-3">
          <p className="text-sm text-[#8e8e9a] mb-4">
            Tienes permisos de administrador. ¿Cómo deseas ingresar?
          </p>
          <button
            onClick={() => { setShowAdminModal(false); navigate('/admin') }}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-[#4f7cff]/10 border border-[#4f7cff]/20 hover:bg-[#4f7cff]/15 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#4f7cff]/20 flex items-center justify-center shrink-0">
              <span className="text-[#4f7cff] text-lg">⚙</span>
            </div>
            <div>
              <div className="font-medium text-[#e8e8ed] text-sm">Entrar como Administrador</div>
              <div className="text-xs text-[#8e8e9a]">Acceso al panel de control</div>
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
              <div className="font-medium text-[#e8e8ed] text-sm">Entrar como Cliente</div>
              <div className="text-xs text-[#8e8e9a]">Ver la tienda como usuario</div>
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

  const handleEmail = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authService.forgotPassword(correo)
      toast({ message: 'Código enviado a tu correo', type: 'success' })
      setStep('code')
    } catch { setError('No encontramos ese correo registrado.') }
    finally { setLoading(false) }
  }

  const handleCode = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authService.verifyCode(correo, codigo)
      setStep('password')
    } catch { setError('Código incorrecto.') }
    finally { setLoading(false) }
  }

  const handlePassword = async (e) => {
    e.preventDefault()
    if (nueva.length < 6) { setError('Mínimo 6 caracteres'); return }
    setError('')
    setLoading(true)
    try {
      await authService.resetPassword(correo, nueva)
      toast({ message: 'Contraseña actualizada con éxito', type: 'success' })
      onClose()
      setStep('email'); setCorreo(''); setCodigo(''); setNueva('')
    } catch { setError('Error al cambiar la contraseña.') }
    finally { setLoading(false) }
  }

  const reset = () => { setStep('email'); setError('') }

  return (
    <Modal open={open} onClose={() => { onClose(); reset() }} title="Recuperar contraseña">
      {step === 'email' && (
        <form onSubmit={handleEmail} className="space-y-4">
          <p className="text-sm text-[#8e8e9a]">Ingresa tu correo y te enviaremos un código.</p>
          <Input label="Correo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">Enviar código</Button>
        </form>
      )}
      {step === 'code' && (
        <form onSubmit={handleCode} className="space-y-4">
          <p className="text-sm text-[#8e8e9a]">Revisa tu correo <strong className="text-[#e8e8ed]">{correo}</strong></p>
          <Input label="Código" value={codigo} onChange={(e) => setCodigo(e.target.value)} required maxLength={6} />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">Verificar</Button>
        </form>
      )}
      {step === 'password' && (
        <form onSubmit={handlePassword} className="space-y-4">
          <p className="text-sm text-[#8e8e9a]">Crea una nueva contraseña.</p>
          <Input label="Nueva contraseña" type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} required minLength={6} />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">Cambiar contraseña</Button>
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
