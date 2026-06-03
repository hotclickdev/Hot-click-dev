import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Input from '@/components/ui/Input'
import useAuthStore from '@/store/authStore'
import { useToast } from '@/components/ui/Toast'
import api from '@/services/api'

const A = { color: '#f97316', ring: 'rgba(249,115,22,0.32)', bg: 'rgba(249,115,22,0.08)' }

export default function RegistrarNegocioPage() {
  const navigate = useNavigate()
  const toast    = useToast()
  const login    = useAuthStore((s) => s.login)
  const { userEmail, userName } = useAuthStore()

  const [form, setForm] = useState({
    nombreEmpresa:   '',
    nombreComercial: '',
    telefonoEmpresa: '',
    correoEmpresa:   userEmail || '',
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombreEmpresa.trim()) { setError('El nombre del negocio es requerido'); return }
    setError(''); setLoading(true)
    try {
      const { data } = await api.post('/auth/upgrade-emprendedor', form)
      login(data)
      toast({ message: '¡Negocio registrado! Bienvenido al panel de emprendedor.', type: 'success' })
      navigate('/admin', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.message
      setError(typeof msg === 'string' ? msg : 'Error al registrar el negocio')
    } finally { setLoading(false) }
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: 'var(--hc-bg)' }}>

      {/* Fondo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 60% 50% at 70% 25%, rgba(249,115,22,0.1), transparent 65%)` }} />
      </div>
      <div className="absolute inset-0 opacity-[0.25] pointer-events-none" style={{
        backgroundImage: 'linear-gradient(var(--hc-border) 1px,transparent 1px),linear-gradient(90deg,var(--hc-border) 1px,transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 sm:px-8 py-4 border-b"
        style={{ borderColor: 'var(--hc-border)', background: 'var(--hc-glass-bg)', backdropFilter: 'blur(16px)' }}>
        <Link to="/" className="flex items-center gap-2.5">
          <div className="hc-logo-badge w-8 h-8 rounded-lg flex items-center justify-center">
            <svg width={15} height={15} viewBox="0 0 24 24" fill="white"><path d="M13 2L3 14h8l-2 8 12-12h-8z"/></svg>
          </div>
          <span className="hc-logo-text font-bold tracking-wide text-sm">HOTCLICK</span>
        </Link>
        <button onClick={() => navigate('/')} className="hc-btn hc-btn-ghost hc-btn-sm">
          Hacer esto después →
        </button>
      </header>

      {/* Contenido */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[460px]">

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-5"
              style={{ background: A.bg, border: `1px solid ${A.ring}`, color: A.color, letterSpacing: '0.06em' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: A.color }} />
              REGISTRÁ TU NEGOCIO
            </div>

            {/* Headline */}
            <div className="mb-7">
              <h1 className="font-black leading-[1.0] tracking-tight"
                style={{ fontSize: 'clamp(2.2rem, 6vw, 3rem)', color: 'var(--hc-text)' }}>
                {userName ? `Hola, ${userName.split(' ')[0]}` : '¡Hola!'}
              </h1>
              <h1 className="font-black leading-[1.0] tracking-tight"
                style={{ fontSize: 'clamp(2.2rem, 6vw, 3rem)', color: A.color }}>
                empezá a vender
              </h1>
              <p className="text-sm mt-3" style={{ color: 'var(--hc-muted)' }}>
                Completá los datos de tu negocio para acceder al panel de emprendedor.
              </p>
            </div>

            {/* Card */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', boxShadow: '0 4px 32px var(--hc-shadow)' }}>
              <div className="h-[3px]" style={{ background: `linear-gradient(90deg, transparent, ${A.color}, transparent)` }} />
              <div className="p-6 sm:p-7">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                  <Input
                    label="Nombre del negocio *"
                    placeholder="Ej: Mi Tienda Tica"
                    value={form.nombreEmpresa}
                    onChange={set('nombreEmpresa')}
                    autoFocus required
                  />
                  <Input
                    label="Nombre comercial (opcional)"
                    placeholder="Como aparecerá en la tienda"
                    value={form.nombreComercial}
                    onChange={set('nombreComercial')}
                  />
                  <Input
                    label="Teléfono del negocio (opcional)"
                    placeholder="+506 8888-8888"
                    value={form.telefonoEmpresa}
                    onChange={set('telefonoEmpresa')}
                  />
                  <Input
                    label="Correo del negocio"
                    type="email"
                    value={form.correoEmpresa}
                    onChange={set('correoEmpresa')}
                    placeholder="negocio@ejemplo.com"
                  />

                  {error && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="px-3 py-2.5 rounded-xl text-sm"
                      style={{ color: 'var(--hc-danger)', background: 'color-mix(in srgb,var(--hc-danger) 7%,transparent)', border: '1px solid color-mix(in srgb,var(--hc-danger) 22%,transparent)' }}>
                      {error}
                    </motion.div>
                  )}

                  <button type="submit" disabled={loading}
                    className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl font-bold text-sm text-white w-full transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60"
                    style={{ background: A.color, boxShadow: `0 0 32px ${A.ring}` }}>
                    {loading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Registrando…
                      </>
                    ) : 'Registrar mi negocio →'}
                  </button>
                </form>
              </div>
            </div>

            <p className="text-center text-xs mt-4" style={{ color: 'var(--hc-muted)' }}>
              Tu negocio quedará pendiente de aprobación. Te avisamos por correo.
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
