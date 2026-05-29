import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { authService } from '@/services/authService'
import { useToast } from '@/components/ui/Toast'
import useAuthStore from '@/store/authStore'
import Input from '@/components/ui/Input'

/* ─── Panel izquierdo ────────────────────────────────────────── */
const PERKS = [
  { icon: '📊', title: 'Panel de ventas en tiempo real',   desc: 'Pedidos, ingresos y estadísticas actualizados' },
  { icon: '💳', title: 'Pagos con tarjeta y SINPE',        desc: 'Recibí pagos seguros sin configurar nada extra' },
  { icon: '🚚', title: 'Logística integrada',               desc: 'Coordiná envíos a todo Costa Rica desde el admin' },
  { icon: '💬', title: 'Soporte dedicado 7 días',           desc: 'Equipo disponible por WhatsApp cuando lo necesitás' },
]
const STATS = [
  { n: '100%', s: 'Gratis para empezar' },
  { n: '24h',  s: 'Tienda activa'       },
  { n: '10K+', s: 'Compradores activos' },
]

const stagger = (i) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: 0.08 + i * 0.1, ease: [0.16, 1, 0.3, 1] },
})

/* ════════════════════════════════════════════════════════════ */
export default function RegistroEmpresaPage() {
  const navigate   = useNavigate()
  const toast      = useToast()
  const loginStore = useAuthStore((s) => s.login)

  const [step,    setStep]    = useState(0)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const [form, setForm] = useState({
    nombreEmpresa: '', correoEmpresa: '', telefonoEmpresa: '',
    nombreAdmin: '', correoAdmin: '', passwordAdmin: '', telefonoAdmin: '',
  })

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }))

  /* Paso 1 → 2 */
  const handleNext = (e) => {
    e.preventDefault(); setError('')
    if (!form.nombreEmpresa.trim()) { setError('El nombre de la empresa es requerido'); return }
    setStep(1)
  }

  /* Submit */
  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')
    if (!form.correoAdmin.trim()) { setError('El correo es requerido'); return }
    if (form.passwordAdmin.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setLoading(true)
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
      if (data?.data) {
        loginStore(data.data)
        toast.success('¡Empresa creada! Bienvenido a tu panel.')
        navigate('/admin')
      }
    } catch (err) {
      const msg = err.response?.data?.message
      setError(typeof msg === 'string' && msg ? msg : 'Error al registrar. Intentá de nuevo.')
    } finally { setLoading(false) }
  }

  /* ─── JSX ─────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ════════════════════════════════════════════════════
          PANEL IZQUIERDO — emprendedores
      ════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[44%] relative flex-col overflow-hidden shrink-0"
        style={{ background: 'linear-gradient(158deg, #0d0400 0%, #1c0a00 45%, #2a0e00 100%)' }}>

        {/* Grid naranja sutil */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(249,115,22,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.05) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }} />
        {/* Orbe naranja */}
        <div className="absolute pointer-events-none" style={{
          top: '-10%', right: '-12%', width: '60%', height: '60%',
          background: 'radial-gradient(circle, rgba(249,115,22,0.3) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }} />
        {/* Orbe ámbar */}
        <div className="absolute pointer-events-none" style={{
          bottom: '5%', left: '-10%', width: '50%', height: '50%',
          background: 'radial-gradient(circle, rgba(234,88,12,0.18) 0%, transparent 70%)',
          filter: 'blur(55px)',
        }} />
        {/* Línea derecha */}
        <div className="absolute right-0 top-0 bottom-0 w-px" style={{
          background: 'linear-gradient(to bottom, transparent, rgba(249,115,22,0.25) 25%, rgba(249,115,22,0.25) 75%, transparent)',
        }} />

        <div className="relative z-10 flex flex-col h-full p-10">

          {/* Logo */}
          <motion.div {...stagger(0)} className="flex items-center gap-3 mb-12">
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(249,115,22,0.5)',
              }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="white">
                  <path d="M13 2L3 14h8l-2 8 12-12h-8z" />
                </svg>
              </div>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.25rem', letterSpacing: '0.04em', color: '#fff5ee' }}>
                HOTCLICK
              </span>
            </Link>
          </motion.div>

          {/* Headline */}
          <div className="flex-1 flex flex-col justify-center">
            <motion.p {...stagger(1)} style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
              color: '#f97316', marginBottom: 18,
            }}>
              Para emprendedores · Costa Rica
            </motion.p>

            {['Emprendé.', 'Crecé.', 'Brillá.'].map((line, i) => (
              <motion.div key={line} {...stagger(2 + i)} style={{
                fontFamily: "'Barlow', sans-serif", fontWeight: 900,
                fontSize: 'clamp(2.4rem, 3.8vw, 3.4rem)', lineHeight: 1.0,
                letterSpacing: '-0.025em',
                color: i === 2 ? '#f97316' : '#fff5ee',
                textShadow: i === 2 ? '0 0 48px rgba(249,115,22,0.55)' : 'none',
              }}>
                {line}
              </motion.div>
            ))}

            <motion.p {...stagger(5)} style={{
              color: 'rgba(255,245,238,0.35)', fontSize: '0.9rem',
              marginTop: '1.1rem', lineHeight: 1.65, marginBottom: '2.5rem', maxWidth: 320,
            }}>
              Registrá tu negocio en HOTCLICK y llegá a miles de compradores en Costa Rica.
            </motion.p>

            {/* Beneficios 2×2 */}
            <motion.div {...stagger(6)} className="grid grid-cols-2 gap-3 mb-10">
              {PERKS.map(({ icon, title, desc }) => (
                <div key={title} style={{
                  background: 'rgba(249,115,22,0.06)',
                  border: '1px solid rgba(249,115,22,0.14)',
                  borderRadius: 14, padding: '14px 12px',
                  backdropFilter: 'blur(12px)',
                }}>
                  <div style={{ fontSize: '1.3rem', marginBottom: 6 }}>{icon}</div>
                  <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.78rem', color: '#fff5ee', marginBottom: 3, lineHeight: 1.2 }}>{title}</p>
                  <p style={{ fontSize: '0.68rem', color: 'rgba(255,245,238,0.35)', lineHeight: 1.4 }}>{desc}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Stats */}
          <motion.div {...stagger(7)} style={{
            borderTop: '1px solid rgba(249,115,22,0.18)', paddingTop: 24, display: 'flex', gap: 36,
          }}>
            {STATS.map(({ n, s }) => (
              <div key={s}>
                <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 900, fontSize: '1.75rem', color: '#f97316', lineHeight: 1 }}>{n}</p>
                <p style={{ fontSize: '0.65rem', color: 'rgba(255,245,238,0.28)', marginTop: 3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          PANEL DERECHO — formulario
      ════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-y-auto" style={{ background: 'var(--hc-bg)' }}>

        {/* Barra superior */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--hc-border)' }}>
          <Link to="/" className="flex items-center gap-2.5" style={{ textDecoration: 'none' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 hc-logo-badge">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white"><path d="M13 2L3 14h8l-2 8 12-12h-8z"/></svg>
            </div>
            <span className="hc-logo-text lg:hidden" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1rem', letterSpacing: '0.04em' }}>
              HOTCLICK
            </span>
          </Link>
          <div className="flex items-center gap-2.5">
            <span style={{ color: 'var(--hc-muted)', fontSize: '0.8rem' }}>¿Ya tenés cuenta?</span>
            <Link to="/login" className="hc-btn hc-btn-ghost hc-btn-sm" style={{ textDecoration: 'none' }}>
              Iniciar sesión
            </Link>
          </div>
        </div>

        {/* Área principal */}
        <div className="flex-1 flex flex-col items-center px-5 py-8">

          {/* Título */}
          <div className="text-center mb-8 w-full max-w-[460px]">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4"
              style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.22)', color: '#f97316', letterSpacing: '0.06em' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              Registro de emprendimiento
            </div>
            <h1 style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 900, fontSize: 'clamp(1.9rem, 5vw, 2.8rem)', color: 'var(--hc-text)', lineHeight: 1.05, marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>
              Registrá tu empresa
            </h1>
            <p style={{ color: 'var(--hc-muted)', fontSize: '0.9rem' }}>
              Completá los datos y empezá a vender hoy en HOTCLICK.
            </p>
          </div>

          <div className="w-full max-w-[460px]">

            {/* ── Tarjeta del formulario ── */}
            <motion.div style={{
              background: 'var(--hc-surface)', border: '1px solid var(--hc-border)',
              borderRadius: 20, overflow: 'hidden',
              boxShadow: '0 8px 40px var(--hc-shadow)',
            }}>
              {/* Barra de color */}
              <div style={{
                height: 3,
                background: 'linear-gradient(90deg, transparent, #f97316, #ea580c, transparent)',
              }} />

              <div className="p-6 sm:p-8">

                <div className="mb-6">
                  <h2 style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 900, fontSize: '1.7rem', color: 'var(--hc-text)', lineHeight: 1.1, letterSpacing: '-0.01em' }}>
                    {step === 0 ? 'Tu empresa' : 'Tu cuenta de acceso'}
                  </h2>
                  <p style={{ color: 'var(--hc-muted)', fontSize: '0.85rem', marginTop: '0.3rem' }}>
                    {step === 0 ? 'Datos básicos de tu negocio.' : 'Con estos datos iniciás sesión en el panel.'}
                  </p>
                </div>

                {/* Progreso */}
                <div className="flex items-center gap-3 mb-6">
                  {['Tu empresa', 'Tu cuenta'].map((label, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                        style={i < step
                          ? { background: 'var(--hc-success, #22c55e)', color: '#fff' }
                          : i === step
                          ? { background: '#f97316', color: '#fff', boxShadow: '0 0 12px rgba(249,115,22,0.4)' }
                          : { background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
                        {i < step
                          ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg>
                          : i + 1}
                      </div>
                      <span className="text-xs font-medium" style={{ color: i === step ? 'var(--hc-text)' : 'var(--hc-muted)' }}>{label}</span>
                      {i < 1 && <div className="h-px w-8 mx-1 rounded transition-all duration-500" style={{ background: step > 0 ? '#f97316' : 'var(--hc-border)' }} />}
                    </div>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {/* Paso 0 — datos de la empresa */}
                  {step === 0 && (
                    <motion.form key="s0"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}
                      onSubmit={handleNext} className="space-y-4">
                      <Input label="Nombre de la empresa *" placeholder="Ej: Mi Tienda Tica"
                        value={form.nombreEmpresa} onChange={set('nombreEmpresa')} autoFocus required />
                      <Input label="Correo de la empresa" type="email" placeholder="contacto@miempresa.com"
                        value={form.correoEmpresa} onChange={set('correoEmpresa')} hint="Opcional" />
                      <Input label="Teléfono empresarial" type="tel" placeholder="+506 8888-8888"
                        value={form.telefonoEmpresa} onChange={set('telefonoEmpresa')} />
                      {error && <ErrMsg>{error}</ErrMsg>}
                      <button type="submit" className="hc-btn hc-btn-primary hc-btn-lg w-full"
                        style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', borderColor: '#f97316', boxShadow: '0 4px 20px rgba(249,115,22,0.3)' }}>
                        Siguiente — Datos del administrador →
                      </button>
                    </motion.form>
                  )}

                  {/* Paso 1 — datos del admin */}
                  {step === 1 && (
                    <motion.form key="s1"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}
                      onSubmit={handleSubmit} className="space-y-4">
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-2"
                        style={{ background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--hc-muted)' }}>
                          Empresa: <strong style={{ color: 'var(--hc-text)' }}>{form.nombreEmpresa}</strong>
                        </span>
                      </div>
                      <Input label="Tu nombre completo" placeholder="Ana García"
                        value={form.nombreAdmin} onChange={set('nombreAdmin')} autoFocus />
                      <Input label="Tu correo *" type="email" placeholder="ana@miempresa.com"
                        value={form.correoAdmin} onChange={set('correoAdmin')} required />
                      <Input label="Contraseña *" type="password" placeholder="Mínimo 6 caracteres"
                        value={form.passwordAdmin} onChange={set('passwordAdmin')} required minLength={6} />
                      <Input label="Teléfono personal" type="tel" placeholder="+506 8888-8888"
                        value={form.telefonoAdmin} onChange={set('telefonoAdmin')} />
                      {error && <ErrMsg>{error}</ErrMsg>}
                      <div className="flex gap-2.5">
                        <button type="button" onClick={() => { setStep(0); setError('') }}
                          className="hc-btn hc-btn-outline px-4">← Atrás</button>
                        <button type="submit" disabled={loading}
                          className="hc-btn hc-btn-primary hc-btn-lg flex-1 disabled:opacity-60"
                          style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', borderColor: '#f97316', boxShadow: '0 4px 20px rgba(249,115,22,0.3)' }}>
                          {loading
                            ? <span className="flex items-center gap-2"><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Creando…</span>
                            : '¡Crear mi empresa! 🚀'}
                        </button>
                      </div>
                      <p className="text-center text-xs" style={{ color: 'var(--hc-muted)' }}>
                        Al registrarte aceptás los{' '}
                        <Link to="/informacion" className="underline hover:opacity-80" style={{ color: 'var(--hc-accent)' }}>términos y condiciones</Link>
                      </p>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Footer */}
            <p className="text-center text-xs mt-6" style={{ color: 'var(--hc-muted)' }}>
              © {new Date().getFullYear()} HOTCLICK · Costa Rica ·{' '}
              <Link to="/informacion" className="hover:underline" style={{ color: 'var(--hc-accent)' }}>Términos</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Sub-componentes ─────────────────────────────────────────── */
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
