import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PhoneField from '@/components/ui/PhoneField'
import Input from '@/components/ui/Input'
import { authService } from '@/services/authService'
import { useToast } from '@/components/ui/Toast'
import useAuthStore from '@/store/authStore'
import { Turnstile } from '@marsidev/react-turnstile'
import { mensajeErrorAuth } from './authHelpers'
import ErrMsg from './ErrMsg'

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

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

      {/* Badge */}
      <div className="flex items-center gap-3 mb-5">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ background: 'rgba(231,59,51,0.08)', border: '1px solid rgba(231,59,51,0.22)', color: 'var(--hc-primary)', letterSpacing: '0.06em' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--hc-primary)] animate-pulse"></span>
          <span>Registro de emprendimiento</span>
        </div>
      </div>

      {/* Headline */}
      <div className="mb-7">
        <h1 className="font-black leading-[1.0] tracking-tight"
          style={{ fontSize: 'clamp(2rem, 6vw, 2.8rem)', color: 'var(--hc-text)' }}>Registrá tu</h1>
        <h1 className="font-black leading-[1.0] tracking-tight"
          style={{ fontSize: 'clamp(2rem, 6vw, 2.8rem)', color: 'var(--hc-primary)' }}>negocio</h1>
        <div className="flex items-center gap-2 mt-3">
          <div className="w-5 h-[2px] rounded-full bg-[var(--hc-primary)]" />
          <p className="text-sm font-medium" style={{ color: 'var(--hc-muted)' }}>Completá los datos y empezá a vender hoy.</p>
        </div>
      </div>

      {/* Card */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', boxShadow: '0 4px 32px var(--hc-shadow)' }}>
        <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, transparent, var(--hc-primary), transparent)' }} />
        <div className="p-6 sm:p-8">

          {/* Progreso */}
          <div className="flex items-center gap-3 mb-6">
            {['Tu negocio', 'Tu cuenta', 'Verificar'].map((label, i) => {
              const activeStepStyle = { background: 'var(--hc-primary)', color: '#fff', boxShadow: '0 0 12px rgba(231,59,51,0.4)' }
              const inactiveStepStyle = { background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }
              const stepStyle = i < step
                ? { background: 'var(--hc-success, #22c55e)', color: '#fff' }
                : (i === step ? activeStepStyle : inactiveStepStyle)
              return (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                    style={stepStyle}>
                    {i < step ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg> : i + 1}
                  </div>
                  <span className="text-xs font-medium" style={{ color: i === step ? 'var(--hc-text)' : 'var(--hc-muted)' }}>{label}</span>
                  {i < 2 && <div className="h-px w-6 mx-1 rounded transition-all duration-500" style={{ background: step > i ? 'var(--hc-primary)' : 'var(--hc-border)' }} />}
                </div>
              )
            })}
          </div>

          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.form key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}
                onSubmit={handleNext} className="space-y-4">
                <Input label="Nombre del negocio *" placeholder="Ej: Mi Tienda Tica"
                  value={form.nombreEmpresa} onChange={actualizarCampo('nombreEmpresa')} autoFocus required maxLength={150} />
                <Input label="Correo del negocio" type="email" placeholder="contacto@minegocio.com"
                  value={form.correoEmpresa} onChange={actualizarCampo('correoEmpresa')} hint="Opcional" maxLength={150} />
                <PhoneField label="Teléfono del negocio"
                  value={form.telefonoEmpresa} onChange={(val) => setForm(p => ({ ...p, telefonoEmpresa: val }))} />
                {error && <ErrMsg>{error}</ErrMsg>}
                <button type="submit" className="hc-btn hc-btn-primary hc-btn-lg w-full"
                  style={{ background: 'var(--hc-primary)', borderColor: 'var(--hc-primary)', boxShadow: '0 4px 20px rgba(231,59,51,0.3)' }}>
                  Continuar →
                </button>
              </motion.form>
            )}
            {step === 1 && (
              <motion.form key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}
                onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-2"
                  style={{ background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--hc-muted)' }}>
                    Negocio: <strong style={{ color: 'var(--hc-text)' }}>{form.nombreEmpresa}</strong>
                  </span>
                </div>
                <Input label="Tu nombre completo" placeholder="Ana García" value={form.nombreAdmin} onChange={actualizarCampo('nombreAdmin')} autoFocus maxLength={100} />
                <Input label="Tu correo *" type="email" placeholder="ana@miempresa.com" value={form.correoAdmin} onChange={actualizarCampo('correoAdmin')} required maxLength={150} />
                <Input label="Contraseña *" type="password" placeholder="Mínimo 8 caracteres" value={form.passwordAdmin} onChange={actualizarCampo('passwordAdmin')} required minLength={8} maxLength={128} />
                <PhoneField label="Teléfono personal"
                  value={form.telefonoAdmin} onChange={(val) => setForm(p => ({ ...p, telefonoAdmin: val }))} />
                {error && <ErrMsg>{error}</ErrMsg>}

                {/* Consentimiento informado — Ley 8968 */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '0.75rem', borderRadius: 10, border: `1px solid ${aceptaTerminos ? 'var(--hc-accent)' : 'var(--hc-border)'}`, background: aceptaTerminos ? 'color-mix(in srgb, var(--hc-accent) 5%, transparent)' : 'var(--hc-surface-2)', transition: 'all 0.15s' }}>
                  <input
                    type="checkbox"
                    checked={aceptaTerminos}
                    onChange={e => setAceptaTerminos(e.target.checked)}
                    style={{ marginTop: 2, flexShrink: 0, accentColor: 'var(--hc-accent)', width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--hc-muted)', lineHeight: 1.6 }}>
                    Al marcar esta casilla, manifiesto de forma libre, expresa, voluntaria e inequívoca que he leído y acepto la{' '}
                    <Link to="/privacidad" style={{ color: 'var(--hc-accent)', textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer">Política de Privacidad</Link>{' '}
                    y los{' '}
                    <Link to="/terminos" style={{ color: 'var(--hc-accent)', textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer">Términos y Condiciones</Link>{' '}
                    de HotClick. Autorizo el tratamiento de mis datos personales y su transferencia al comercio vendedor para coordinar la entrega. Conozco mis derechos ARCO en <a href="mailto:hotclick.cr@gmail.com" style={{ color: 'var(--hc-accent)' }}>hotclick.cr@gmail.com</a>.
                  </span>
                </label>

                {TURNSTILE_SITE_KEY && (
                  <Turnstile
                    ref={turnstileRef}
                    siteKey={TURNSTILE_SITE_KEY}
                    onSuccess={setTurnstileToken}
                    onError={() => setTurnstileToken('')}
                    onExpire={() => setTurnstileToken('')}
                    options={{ appearance: 'invisible' }}
                  />
                )}

                <div className="flex gap-2.5">
                  <button type="button" onClick={() => { setStep(0); setError('') }} className="hc-btn hc-btn-outline px-4">← Atrás</button>
                  <button type="submit" disabled={loading || !aceptaTerminos || (!!TURNSTILE_SITE_KEY && !turnstileToken)}
                    className="hc-btn hc-btn-primary hc-btn-lg flex-1 disabled:opacity-60"
                    style={{ background: 'var(--hc-primary)', borderColor: 'var(--hc-primary)', boxShadow: '0 4px 20px rgba(231,59,51,0.3)' }}>
                    {loading
                      ? <span className="flex items-center gap-2"><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Creando…</span>
                      : 'Crear mi negocio →'}
                  </button>
                </div>
              </motion.form>
            )}

            {/* ── Paso 2: verificar correo ── */}
            {step === 2 && (
              <motion.form key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}
                onSubmit={handleVerificar} className="space-y-5">
                <div className="text-center py-2">
                  <div className="text-4xl mb-3">📧</div>
                  <h3 className="font-bold text-base" style={{ color: 'var(--hc-text)' }}>Verificá tu correo</h3>
                  <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
                    {otpFalló
                      ? <>No se pudo enviar el código a <strong style={{ color: 'var(--hc-text)' }}>{correoReg}</strong>. Presioná "Reenviar código".</>
                      : <>Enviamos un código de 6 dígitos a <strong style={{ color: 'var(--hc-text)' }}>{correoReg}</strong></>
                    }
                  </p>
                </div>

                {otpFalló ? (
                  <div className="rounded-xl px-4 py-3 text-sm text-center"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                    El código no pudo enviarse. Verificá que el correo sea correcto o intentá reenviar.
                  </div>
                ) : (
                  <div>
                    <label htmlFor="reg-codigo-verif" className="hc-input-label block mb-2" style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--hc-muted)' }}>
                      Código de verificación
                    </label>
                    <input id="reg-codigo-verif"
                      type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                      placeholder="000000" autoFocus
                      value={codigoVerif}
                      onChange={e => setCodigoVerif(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full text-center outline-none"
                      style={{
                        height: '68px', borderRadius: '14px', fontSize: '32px', fontWeight: 900,
                        letterSpacing: '0.4em', background: 'var(--hc-surface-2)',
                        border: '1.5px solid var(--hc-border)', color: 'var(--hc-text)',
                      }}
                    />
                  </div>
                )}

                {error && <ErrMsg>{error}</ErrMsg>}

                {!otpFalló && (
                  <button type="submit" disabled={loading || codigoVerif.length !== 6}
                    className="hc-btn hc-btn-primary hc-btn-lg w-full disabled:opacity-50"
                    style={{ background: 'var(--hc-primary)', borderColor: 'var(--hc-primary)', boxShadow: '0 4px 20px rgba(231,59,51,0.3)' }}>
                    {loading ? 'Verificando…' : 'Verificar y entrar al panel →'}
                  </button>
                )}

                <button type="button" onClick={handleReenviar} disabled={reenvioLoad}
                  className="w-full text-center text-xs py-1.5 rounded-lg transition-opacity disabled:opacity-50"
                  style={{ color: 'var(--hc-accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {reenvioLoad ? 'Enviando…' : '¿No llegó el código? Reenviar →'}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Volver — oculto durante verificación para no perder el contexto */}
      {step < 2 && (
        <button onClick={onVolver}
          className="mt-5 w-full text-center text-sm py-2 rounded-xl transition-colors hover:opacity-70"
          style={{ color: 'var(--hc-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
          ← Registrarme como comprador
        </button>
      )}
    </motion.div>
  )
}
