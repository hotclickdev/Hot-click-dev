import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BrandLogo from '@/components/ui/BrandLogo'
import { motion, AnimatePresence } from 'framer-motion'
import SocialLoginButtons from '@/components/auth/SocialLoginButtons'
import { registrarConsentimiento } from '@/services/api'

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
import { useTranslation } from 'react-i18next'
import PhoneField from '@/components/ui/PhoneField'
import Input from '@/components/ui/Input'
import { authService } from '@/services/authService'
import { useToast } from '@/components/ui/Toast'
import useAuthStore from '@/store/authStore'
import useCartStore from '@/store/cartStore'
import Modal from '@/components/ui/Modal'
import { abandonedCartService } from '@/services/abandonedCartService'

const BUYER = {
  color: 'var(--hc-accent)',
  glow:  'color-mix(in srgb, var(--hc-accent) 22%, transparent)',
  bg:    'color-mix(in srgb, var(--hc-accent) 8%, transparent)',
  ring:  'color-mix(in srgb, var(--hc-accent) 32%, transparent)',
}
const EMPR = { color: '#0ea5e9', glow: 'rgba(14,165,233,0.22)', bg: 'rgba(14,165,233,0.07)', ring: 'rgba(14,165,233,0.32)' }

const VENTAJAS = [
  { icon: '🏪', text: 'Tu tienda en línea propia' },
  { icon: '👥', text: 'Llegá a miles de compradores' },
  { icon: '📊', text: 'Panel de ventas y pedidos' },
  { icon: '💳', text: 'Pagos SINPE y tarjeta incluidos' },
  { icon: '🚚', text: 'Logística Correos CR integrada' },
]

/* ─── Nube emprendimiento ────────────────────────────────── */
function EmprendimientoCloud({ onRegistrar }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl overflow-hidden relative lg:sticky lg:top-8"
      style={{ background: 'var(--hc-surface)', border: `1px solid ${EMPR.ring}`, boxShadow: `0 0 48px ${EMPR.glow}, 0 8px 32px var(--hc-shadow)` }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${EMPR.glow}, transparent 65%)` }} />
      <div className="h-[3px]" style={{ background: `linear-gradient(90deg, transparent, ${EMPR.color}, transparent)` }} />
      <div className="relative p-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold mb-5 w-fit"
          style={{ background: EMPR.bg, border: `1px solid ${EMPR.ring}`, color: EMPR.color }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: EMPR.color }}></span>
          <span>¿Tenés un negocio?</span>
        </div>
        <h2 className="font-black leading-[1.02] tracking-tight mb-3"
          style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', color: 'var(--hc-text)' }}>
          Emprendé en<br /><span style={{ color: EMPR.color }}>HotClick</span>
        </h2>
        <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
          Únite a la comunidad de emprendedores activos en Costa Rica. Miles de compradores ya esperan tu tienda.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5 mb-6">
          {VENTAJAS.map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-2.5">
              <div className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-sm"
                style={{ background: EMPR.bg, border: `1px solid ${EMPR.ring}` }}>{icon}</div>
              <span className="text-sm" style={{ color: 'var(--hc-text)' }}>{text}</span>
            </div>
          ))}
        </div>
        <button onClick={onRegistrar}
          className="group inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl font-bold text-sm text-white w-full transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
          style={{ background: EMPR.color, boxShadow: `0 0 32px ${EMPR.ring}` }}>
          <span>Registrá tu negocio</span>
          <span className="inline-block group-hover:translate-x-1 transition-transform duration-200">→</span>
        </button>
        <div className="flex gap-5 mt-5 pt-5 border-t" style={{ borderColor: 'var(--hc-border)' }}>
          {[['100%', 'Gratis'], ['Miles', 'Compradores'], ['0', 'Cuotas']].map(([v, l]) => (
            <div key={l}>
              <div className="text-lg font-bold" style={{ color: EMPR.color }}>{v}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Formulario emprendimiento (2 pasos) ───────────────── */
function EmprendimientoForm({ onVolver }) {
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
  const [form, setForm] = useState({
    nombreEmpresa: '', correoEmpresa: '', telefonoEmpresa: '',
    nombreAdmin: '', correoAdmin: '', passwordAdmin: '', telefonoAdmin: '',
  })
  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }))

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
    registrarConsentimiento('REGISTRO')
    try {
      const { data } = await authService.registroEmpresa({
        nombreEmpresa:   form.nombreEmpresa.trim(),
        correoEmpresa:   form.correoEmpresa.trim().toLowerCase() || undefined,
        telefonoEmpresa: form.telefonoEmpresa.trim() || undefined,
        nombreAdmin:     form.nombreAdmin.trim() || undefined,
        correoAdmin:     form.correoAdmin.trim().toLowerCase(),
        passwordAdmin:   form.passwordAdmin,
        telefonoAdmin:   form.telefonoAdmin.trim() || undefined,
      })
      const authData = data?.data ?? data
      if (authData?.accessToken) {
        loginStore(authData)
        setCorreoReg(form.correoAdmin.trim().toLowerCase())
        setOtpFalló(authData.otpEnviado === false)
        setStep(2)
      }
    } catch (err) {
      const msg = err.response?.data?.message
      setError(typeof msg === 'string' && msg ? msg : 'Error al registrar. Intentá de nuevo.')
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
      const msg = err.response?.data?.message
      setError(typeof msg === 'string' && msg ? msg : 'Código incorrecto o expirado')
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
      const msg = err.response?.data?.message
      toast({ message: typeof msg === 'string' && msg ? msg : 'Error al reenviar el código', type: 'error' })
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
            {['Tu negocio', 'Tu cuenta', 'Verificar'].map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                  style={i < step ? { background: 'var(--hc-success, #22c55e)', color: '#fff' }
                    : i === step ? { background: 'var(--hc-primary)', color: '#fff', boxShadow: '0 0 12px rgba(231,59,51,0.4)' }
                    : { background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
                  {i < step ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg> : i + 1}
                </div>
                <span className="text-xs font-medium" style={{ color: i === step ? 'var(--hc-text)' : 'var(--hc-muted)' }}>{label}</span>
                {i < 2 && <div className="h-px w-6 mx-1 rounded transition-all duration-500" style={{ background: step > i ? 'var(--hc-primary)' : 'var(--hc-border)' }} />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.form key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}
                onSubmit={handleNext} className="space-y-4">
                <Input label="Nombre del negocio *" placeholder="Ej: Mi Tienda Tica"
                  value={form.nombreEmpresa} onChange={set('nombreEmpresa')} autoFocus required maxLength={150} />
                <Input label="Correo del negocio" type="email" placeholder="contacto@minegocio.com"
                  value={form.correoEmpresa} onChange={set('correoEmpresa')} hint="Opcional" maxLength={150} />
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
                <Input label="Tu nombre completo" placeholder="Ana García" value={form.nombreAdmin} onChange={set('nombreAdmin')} autoFocus maxLength={100} />
                <Input label="Tu correo *" type="email" placeholder="ana@miempresa.com" value={form.correoAdmin} onChange={set('correoAdmin')} required maxLength={150} />
                <Input label="Contraseña *" type="password" placeholder="Mínimo 8 caracteres" value={form.passwordAdmin} onChange={set('passwordAdmin')} required minLength={8} maxLength={128} />
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

                <div className="flex gap-2.5">
                  <button type="button" onClick={() => { setStep(0); setError('') }} className="hc-btn hc-btn-outline px-4">← Atrás</button>
                  <button type="submit" disabled={loading || !aceptaTerminos}
                    className="hc-btn hc-btn-primary hc-btn-lg flex-1 disabled:opacity-60"
                    style={{ background: 'var(--hc-primary)', borderColor: 'var(--hc-primary)', boxShadow: '0 4px 20px rgba(231,59,51,0.3)' }}>
                    {loading ? <span className="flex items-center gap-2"><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Creando…</span> : 'Crear mi negocio →'}
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

function ErrMsg({ children }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
      style={{ background: 'color-mix(in srgb, var(--hc-danger) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-danger) 22%, transparent)', color: 'var(--hc-danger)' }}>
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {children}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════ */
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

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

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
      const msg = err.response?.data?.message
      setError(typeof msg === 'string' && msg ? msg : 'Error al enviar el código. Intentá de nuevo.')
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
      const msg = err.response?.data?.message
      setError(typeof msg === 'string' && msg ? msg : 'Código incorrecto o expirado')
    } finally { setLoading(false) }
  }

  const handleReenviar = async () => {
    setError(''); setLoading(true)
    try {
      await authService.sendVerification(form)
      toast({ message: t('register.resentSuccess'), type: 'success' })
      setCodigo('')
    } catch (err) {
      const msg = err?.response?.data?.message
      setError(typeof msg === 'string' && msg ? msg : 'Error al reenviar el código. Intentá de nuevo.')
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
                          <Input label={`${t('register.name')} *`} value={form.nombre} onChange={set('nombre')} required placeholder="Juan" maxLength={100} />
                          <Input label={`${t('register.lastName')} *`} value={form.apellidoPaterno} onChange={set('apellidoPaterno')} required placeholder="Pérez" maxLength={100} />
                        </div>
                        <Input label={t('register.motherLastName')} value={form.apellidoMaterno} onChange={set('apellidoMaterno')} placeholder={t('common.optional')} maxLength={100} />
                        <Input label={`${t('register.email')} *`} type="email" value={form.correo} onChange={set('correo')} required placeholder="tu@email.com" maxLength={150} />
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1.5">
                            <label className="hc-input-label">{t('register.phone')}</label>
                            <PhoneField value={form.telefono} onChange={(val) => setForm(f => ({ ...f, telefono: val }))} required />
                          </div>
                          <Input label={`${t('register.identification')} *`} value={form.identificacion} onChange={set('identificacion')} required placeholder="1-2345-6789" maxLength={20} />
                        </div>
                        <Input label={`${t('register.password')} *`} type="password"
                          value={form.contrasenaHash} onChange={set('contrasenaHash')}
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

/* ─── Modal carrito abandonado ─── */
function CartModal({ open, cart, addItem, onClose, onDone }) {
  const restore = async () => {
    cart?.items?.forEach((item) =>
      addItem({ id: item.productoId, nombre: item.nombre, precio: item.precio,
                imagenUrl: item.imagenUrl, stock: item.stock ?? item.cantidad ?? 1 }, item.cantidad ?? 1)
    )
    try {
      const { abandonedCartService: svc } = await import('@/services/abandonedCartService')
      await svc.deleteAbandonedCart(cart.id)
    } catch { /* ok */ }
    onClose(); onDone()
  }
  const discard = async () => {
    try {
      const { abandonedCartService: svc } = await import('@/services/abandonedCartService')
      await svc.deleteAbandonedCart(cart.id)
    } catch { /* ok */ }
    onClose(); onDone()
  }
  return (
    <Modal open={open} title="¡Tenés productos guardados!">
      <div>
        <p className="text-sm mb-4" style={{ color: 'var(--hc-muted)' }}>
          Dejaste {cart?.items?.length ?? 0} producto(s) en tu carrito antes. ¿Querés restaurarlos?
        </p>
        <div className="space-y-2 mb-5">
          {cart?.items?.slice(0, 3).map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 py-1">
              {item.imagenUrl && <img src={item.imagenUrl} alt={item.nombre} width={32} height={32} className="rounded-lg object-cover shrink-0" />}
              <span className="text-sm truncate flex-1" style={{ color: 'var(--hc-text)' }}>{item.nombre}</span>
              <span className="text-xs shrink-0" style={{ color: 'var(--hc-muted)' }}>×{item.cantidad ?? 1}</span>
            </div>
          ))}
          {(cart?.items?.length ?? 0) > 3 && (
            <p className="text-xs pl-1" style={{ color: 'var(--hc-muted)' }}>y {cart.items.length - 3} más…</p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={restore} className="hc-btn hc-btn-primary flex-1">Restaurar carrito</button>
          <button onClick={discard} className="hc-btn hc-btn-outline flex-1">Descartar</button>
        </div>
      </div>
    </Modal>
  )
}
