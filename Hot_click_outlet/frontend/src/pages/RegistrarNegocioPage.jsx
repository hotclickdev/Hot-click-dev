import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import BrandLogo from '@/components/ui/BrandLogo'
import { motion, AnimatePresence } from 'framer-motion'
import Input from '@/components/ui/Input'
import PhoneField from '@/components/ui/PhoneField'
import useAuthStore from '@/store/authStore'
import { useToast } from '@/components/ui/Toast'
import api, { registrarConsentimiento } from '@/services/api'

const A = { color: 'var(--hc-primary)', ring: 'rgba(231,59,51,0.32)', bg: 'rgba(231,59,51,0.08)' }

const ESTADO_COLOR = {
  INSCRITO:            { bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.30)', text: '#16a34a', label: 'Inscrito' },
  DESINSCRITO:         { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.30)', text: '#dc2626', label: 'Desinscrito' },
  NO_INSCRITO:         { bg: 'rgba(107,114,128,0.10)', border: 'rgba(107,114,128,0.30)', text: '#6b7280', label: 'No inscrito' },
  NO_ENCONTRADO:       { bg: 'rgba(107,114,128,0.10)', border: 'rgba(107,114,128,0.30)', text: '#6b7280', label: 'No encontrado' },
  SERVICIO_NO_DISPONIBLE: { bg: 'rgba(234,179,8,0.10)', border: 'rgba(234,179,8,0.30)', text: '#ca8a04', label: 'Servicio no disponible' },
}

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

  // Hacienda verification state
  const [cedula,           setCedula]           = useState('')
  const [verificando,      setVerificando]       = useState(false)
  const [haciendaResult,   setHaciendaResult]   = useState(null)   // ContribuyenteDTO | null
  const [haciendaError,    setHaciendaError]    = useState('')
  const [declaraInscrito,  setDeclaraInscrito]  = useState(false)

  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [aceptaAcuerdo, setAceptaAcuerdo] = useState(false)

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }))

  const verificarHacienda = async () => {
    const c = cedula.trim().replace(/\D/g, '')
    if (!c || c.length < 9) { setHaciendaError('Ingresá una cédula válida (9 o más dígitos)'); return }
    setHaciendaError('')
    setVerificando(true)
    setHaciendaResult(null)
    setDeclaraInscrito(false)
    try {
      const { data } = await api.get(`/hacienda/contribuyente/${c}`)
      setHaciendaResult(data)
    } catch {
      setHaciendaError('No se pudo consultar Hacienda. Intentá de nuevo.')
    } finally {
      setVerificando(false)
    }
  }

  const haciendaValida = haciendaResult?.inscrito === true && declaraInscrito

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!aceptaAcuerdo) { setError('Debés aceptar el Acuerdo de Vendedores para continuar'); return }
    if (!form.nombreEmpresa.trim()) { setError('El nombre del negocio es requerido'); return }
    if (cedula && !haciendaValida) {
      setError('Verificá tu inscripción en Hacienda antes de continuar')
      return
    }
    setError(''); setLoading(true)
    registrarConsentimiento('VENDEDOR')
    try {
      const payload = {
        ...form,
        ...(haciendaValida && {
          cedulaJuridica:    cedula.trim(),
          inscritoHacienda:  true,
          regimenTributario: haciendaResult.regimen,
          nombreHacienda:    haciendaResult.nombre,
        }),
      }
      const { data } = await api.post('/auth/upgrade-emprendedor', payload)
      login(data?.data ?? data)
      toast({ message: '¡Negocio registrado! Bienvenido al panel de emprendedor.', type: 'success' })
      navigate('/admin', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.message
      setError(typeof msg === 'string' ? msg : 'Error al registrar el negocio')
    } finally { setLoading(false) }
  }

  const estadoInfo = haciendaResult ? (ESTADO_COLOR[haciendaResult.estadoInscripcion] ?? ESTADO_COLOR.NO_ENCONTRADO) : null

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: 'var(--hc-bg)' }}>

      {/* Fondo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 60% 50% at 70% 25%, rgba(231,59,51,0.1), transparent 65%)` }} />
      </div>
      <div className="absolute inset-0 opacity-[0.25] pointer-events-none" style={{
        backgroundImage: 'linear-gradient(var(--hc-border) 1px,transparent 1px),linear-gradient(90deg,var(--hc-border) 1px,transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 sm:px-8 py-4 border-b"
        style={{ borderColor: 'var(--hc-border)', background: 'var(--hc-glass-bg)', backdropFilter: 'blur(16px)' }}>
        <Link to="/" className="flex items-center gap-2.5">
          <BrandLogo size={28} wordmarkSize={15} />
        </Link>
        <button onClick={() => navigate('/')} className="hc-btn hc-btn-ghost hc-btn-sm">
          Hacer esto después →
        </button>
      </header>

      {/* Contenido */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[480px]">

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-5"
              style={{ background: A.bg, border: `1px solid ${A.ring}`, color: A.color, letterSpacing: '0.06em' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: A.color }}></span>
              <span>REGISTRÁ TU NEGOCIO</span>
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
                  <PhoneField
                    label="Teléfono del negocio (opcional)"
                    value={form.telefonoEmpresa}
                    onChange={(val) => setForm(p => ({ ...p, telefonoEmpresa: val }))}
                  />
                  <Input
                    label="Correo del negocio"
                    type="email"
                    value={form.correoEmpresa}
                    onChange={set('correoEmpresa')}
                    placeholder="negocio@ejemplo.com"
                  />

                  {/* ── Verificación Hacienda CR ── */}
                  <div className="rounded-xl p-4 flex flex-col gap-3"
                    style={{ background: 'var(--hc-bg)', border: '1px solid var(--hc-border)' }}>
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>
                      Inscripción en Hacienda CR (opcional)
                    </p>
                    <p className="text-xs" style={{ color: 'var(--hc-muted)', lineHeight: 1.6 }}>
                      Si tu negocio está inscrito en Tributación Directa, verificalo acá para habilitar facturación electrónica en el futuro.
                    </p>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Cédula / RUC (sin guiones)"
                        value={cedula}
                        onChange={e => { setCedula(e.target.value); setHaciendaResult(null); setHaciendaError(''); setDeclaraInscrito(false) }}
                        className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none focus:ring-2"
                        style={{
                          background: 'var(--hc-surface)',
                          border: '1px solid var(--hc-border)',
                          color: 'var(--hc-text)',
                          '--tw-ring-color': A.ring,
                        }}
                      />
                      <button
                        type="button"
                        onClick={verificarHacienda}
                        disabled={verificando || !cedula.trim()}
                        className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-50"
                        style={{ background: '#1e40af', minWidth: 80 }}
                      >
                        {verificando ? (
                          <svg className="w-4 h-4 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                        ) : 'Verificar'}
                      </button>
                    </div>

                    {haciendaError && (
                      <p className="text-xs" style={{ color: 'var(--hc-danger)' }}>{haciendaError}</p>
                    )}

                    <AnimatePresence>
                      {haciendaResult && estadoInfo && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="rounded-lg p-3 flex flex-col gap-1.5"
                          style={{ background: estadoInfo.bg, border: `1px solid ${estadoInfo.border}` }}>
                          <div className="flex items-center gap-2">
                            {haciendaResult.inscrito ? (
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: estadoInfo.text }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: estadoInfo.text }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                            <span className="text-xs font-bold" style={{ color: estadoInfo.text }}>
                              {estadoInfo.label}
                            </span>
                          </div>
                          {haciendaResult.nombre && (
                            <p className="text-xs font-semibold" style={{ color: 'var(--hc-text)' }}>{haciendaResult.nombre}</p>
                          )}
                          {haciendaResult.regimen && (
                            <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Régimen: {haciendaResult.regimen}</p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {haciendaResult?.inscrito && (
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={declaraInscrito}
                          onChange={e => setDeclaraInscrito(e.target.checked)}
                          style={{ marginTop: 2, accentColor: '#1e40af', width: 14, height: 14, flexShrink: 0 }}
                        />
                        <span style={{ fontSize: 11, color: 'var(--hc-muted)', lineHeight: 1.6 }}>
                          Declaro que estoy inscrito en Tributación Directa y que el número de identificación corresponde a mi negocio.
                        </span>
                      </label>
                    )}
                  </div>

                  {/* Acuerdo de Vendedores */}
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '0.75rem', borderRadius: 10, border: `1px solid ${aceptaAcuerdo ? A.color : 'var(--hc-border)'}`, background: aceptaAcuerdo ? `${A.bg}` : 'transparent', transition: 'all 0.15s' }}>
                    <input
                      type="checkbox"
                      checked={aceptaAcuerdo}
                      onChange={e => setAceptaAcuerdo(e.target.checked)}
                      style={{ marginTop: 2, accentColor: A.color, width: 15, height: 15, flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--hc-muted)', lineHeight: 1.6 }}>
                      He leído y acepto el{' '}
                      <Link to="/acuerdo-vendedores" target="_blank" style={{ color: A.color, textDecoration: 'none' }}>Acuerdo de Vendedores</Link>
                      , reconozco mi rol como <strong style={{ color: 'var(--hc-text)' }}>Encargado de Tratamiento</strong> de datos de clientes conforme a la Ley N.° 8968 y acepto las obligaciones de confidencialidad e indemnidad estipuladas.
                    </span>
                  </label>

                  {error && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="px-3 py-2.5 rounded-xl text-sm"
                      style={{ color: 'var(--hc-danger)', background: 'color-mix(in srgb,var(--hc-danger) 7%,transparent)', border: '1px solid color-mix(in srgb,var(--hc-danger) 22%,transparent)' }}>
                      {error}
                    </motion.div>
                  )}

                  <button type="submit" disabled={loading || !aceptaAcuerdo}
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
