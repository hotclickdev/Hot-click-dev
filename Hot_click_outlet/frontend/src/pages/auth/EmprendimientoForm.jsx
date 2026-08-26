import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { authService } from '@/services/authService'
import { useToast } from '@/components/ui/Toast'
import useAuthStore from '@/store/authStore'
import { mensajeErrorAuth } from './authHelpers'
import EmprendimientoHeader from './emprendimiento/EmprendimientoHeader'
import EmprendimientoProgreso from './emprendimiento/EmprendimientoProgreso'
import EmprendimientoPasoNegocio from './emprendimiento/EmprendimientoPasoNegocio'
import EmprendimientoPasoCuenta from './emprendimiento/EmprendimientoPasoCuenta'
import EmprendimientoPasoVerificar from './emprendimiento/EmprendimientoPasoVerificar'
import TextoFlecha from '@/components/ui/TextoFlecha'

export default function EmprendimientoForm({ onVolver }) {
  const navigate   = useNavigate()
  const toast      = useToast()
  const loginStore = useAuthStore((s) => s.login)

  const [step,        setStep]        = useState(0)
  const [loading,     setLoading]     = useState(false)
  const [reenvioLoad, setReenvioLoad] = useState(false)
  const [otpFalló,    setOtpFalló]    = useState(false)
  const [error,       setError]       = useState('')
  const [codigoVerif, setCodigoVerif] = useState('')
  const [correoReg,   setCorreoReg]   = useState('')
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const turnstileRef = useRef(null)
  const [form, setForm] = useState({
    nombreEmpresa: '', correoEmpresa: '', telefonoEmpresa: '',
    nombreAdmin: '', correoAdmin: '', passwordAdmin: '', telefonoAdmin: '',
  })
  const actualizarCampo = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }))

  const handleNext = (e) => {
    e.preventDefault(); setError('')
    if (!form.nombreEmpresa.trim()) { setError('El nombre del negocio es requerido'); return }
    setStep(1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')
    if (!form.correoAdmin.trim()) { setError('El correo es requerido'); return }
    if (form.passwordAdmin.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return }
    setLoading(true)
    authService.registrarConsentimiento('REGISTRO')
    try {
      const { data } = await authService.registroEmpresa({
        nombreEmpresa:   form.nombreEmpresa.trim(),
        correoEmpresa:   form.correoEmpresa.trim().toLowerCase() || undefined,
        telefonoEmpresa: form.telefonoEmpresa.trim() || undefined,
        nombreAdmin:     form.nombreAdmin.trim() || undefined,
        correoAdmin:     form.correoAdmin.trim().toLowerCase(),
        passwordAdmin:   form.passwordAdmin,
        telefonoAdmin:   form.telefonoAdmin.trim() || undefined,
        ...(turnstileToken ? { turnstileToken } : {}),
      })
      const authData = data?.data ?? data
      if (authData?.accessToken) {
        loginStore(authData)
        setCorreoReg(form.correoAdmin.trim().toLowerCase())
        setOtpFalló(authData.otpEnviado === false)
        setStep(2)
      }
    } catch (err) {
      setError(mensajeErrorAuth(err, 'Error al registrar. Intentá de nuevo.') || 'Error al registrar. Intentá de nuevo.')
      turnstileRef.current?.reset()
      setTurnstileToken('')
    } finally { setLoading(false) }
  }

  const handleVerificar = async (e) => {
    e.preventDefault(); setError('')
    if (!codigoVerif.trim()) { setError('Ingresá el código de verificación'); return }
    setLoading(true)
    try {
      await authService.verificarCorreoNegocio(correoReg, codigoVerif.trim())
      toast({ message: '¡Correo verificado! Bienvenido a tu panel.', type: 'success' })
      navigate('/admin')
    } catch (err) {
      setError(mensajeErrorAuth(err, 'Código incorrecto o expirado') || 'Código incorrecto o expirado')
    } finally { setLoading(false) }
  }

  const handleReenviar = async () => {
    setReenvioLoad(true); setError('')
    try {
      await authService.reenviarCodigoNegocio()
      setOtpFalló(false)
      setCodigoVerif('')
      toast({ message: `Código reenviado a ${correoReg}`, type: 'success' })
    } catch (err) {
      toast({ message: mensajeErrorAuth(err, 'Error al reenviar el código') || 'Error al reenviar el código', type: 'error' })
    } finally { setReenvioLoad(false) }
  }

  return (
    <motion.div key="emp-form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.3 }}>

      <EmprendimientoHeader />

      {/* Card */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', boxShadow: '0 4px 32px var(--hc-shadow)' }}>
        <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, transparent, var(--hc-primary), transparent)' }} />
        <div className="p-6 sm:p-8">

          <EmprendimientoProgreso step={step} />

          <AnimatePresence mode="wait">
            {step === 0 && (
              <EmprendimientoPasoNegocio
                form={form} error={error} actualizarCampo={actualizarCampo}
                setForm={setForm} onSubmit={handleNext} />
            )}
            {step === 1 && (
              <EmprendimientoPasoCuenta
                form={form} error={error} loading={loading}
                aceptaTerminos={aceptaTerminos} turnstileToken={turnstileToken}
                turnstileRef={turnstileRef} actualizarCampo={actualizarCampo}
                setForm={setForm} setAceptaTerminos={setAceptaTerminos}
                setTurnstileToken={setTurnstileToken}
                onSubmit={handleSubmit}
                onAtras={() => { setStep(0); setError('') }} />
            )}

            {/* ── Paso 2: verificar correo ── */}
            {step === 2 && (
              <EmprendimientoPasoVerificar
                correoReg={correoReg} otpFalló={otpFalló} codigoVerif={codigoVerif}
                error={error} loading={loading} reenvioLoad={reenvioLoad}
                setCodigoVerif={setCodigoVerif}
                onSubmit={handleVerificar} onReenviar={handleReenviar} />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Volver — oculto durante verificación para no perder el contexto */}
      {step < 2 && (
        <button type="button" onClick={onVolver}
          className="mt-5 w-full text-center text-sm py-2 rounded-xl transition-colors hover:opacity-70"
          style={{ color: 'var(--hc-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <TextoFlecha dir="atras">Registrarme como comprador</TextoFlecha>
        </button>
      )}
    </motion.div>
  )
}
