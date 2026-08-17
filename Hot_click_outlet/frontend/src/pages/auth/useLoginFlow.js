import { useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getAvailableModes, MODE_PREF_KEY } from '@/utils/modes'
import { useTranslation } from 'react-i18next'
import { authService } from '@/services/authService'
import useAuthStore from '@/store/authStore'
import useCartStore from '@/store/cartStore'
import { useToast } from '@/components/ui/Toast'
import { abandonedCartService } from '@/services/abandonedCartService'
import { destinoPostLogin, mensajeErrorAuth } from './authHelpers'

/**
 * Estado y handlers del flujo de login (credenciales, 2FA, webauthn, forgot).
 * Side effects en el mismo orden que LoginPage original.
 */
export function useLoginFlow() {
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

  return {
    navigate,
    t,
    step, setStep,
    loading,
    correo, setCorreo,
    contrasena, setContrasena,
    code2FA, setCode2FA,
    useRecovery, setUseRecovery,
    recoveryInput, setRecoveryInput,
    showForgot, setShowForgot,
    showAdminModal, setShowAdminModal,
    showCartRecovery, setShowCartRecovery,
    recoveryCart,
    recoveryDest,
    addItem,
    error, setError,
    needsVerification,
    needsPasswordReset,
    resendLoading,
    refs2FA,
    turnstileRef,
    turnstileToken, setTurnstileToken,
    twoFaMethods,
    resendCooldown,
    handleLogin,
    handleResendVerification,
    sendEmailOtp,
    handlePickMethod,
    handle2FA,
    handleEmailOtp,
    handleLoginSuccess,
  }
}
