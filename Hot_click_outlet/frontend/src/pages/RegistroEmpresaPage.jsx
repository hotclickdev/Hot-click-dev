import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { HotClickMark } from '@/components/ui/BrandLogo'
import { AnimatePresence } from 'framer-motion'
import { authService } from '@/services/authService'
import { useToast } from '@/components/ui/Toast'
import useAuthStore from '@/store/authStore'
import Seo from '@/components/seo/Seo'
import { MIN_PASSWORD } from './registro-empresa/registroEmpresaHelpers'
import RegistroEmpresaAside from './registro-empresa/RegistroEmpresaAside'
import StepTributacion from './registro-empresa/StepTributacion'
import StepDatosEmpresa from './registro-empresa/StepDatosEmpresa'
import StepDatosAdmin from './registro-empresa/StepDatosAdmin'
import { isTokenAlive } from '@/utils/authToken'
import { rutaLoginConRetorno } from '@/utils/authRedirect'
import { destinoVender, RUTA_REGISTRO_EMPRESA, RUTA_REGISTRAR_NEGOCIO } from '@/utils/destinoVender'

const STEP_TITLES = ['Requisito previo', 'Tu empresa', 'Tu cuenta de acceso']
const STEP_DESCS = [
  'Verificamos que puedas emitir facturas electrónicas.',
  'Datos básicos de tu negocio.',
  'Con estos datos iniciás sesión en el panel.',
]
const STEP_LABELS = ['Tributación', 'Tu empresa', 'Tu cuenta']

function estiloPaso(indice, step, tributacion) {
  const hasDanger = tributacion === false && indice === 0
  if (indice < step) {
    return { background: 'var(--hc-success, #22c55e)', color: '#fff' }
  }
  if (indice === step) {
    return {
      background: hasDanger ? 'var(--hc-danger)' : 'var(--hc-primary)',
      color: '#fff',
      boxShadow: hasDanger ? '0 0 12px rgba(239,68,68,0.4)' : '0 0 12px rgba(231,59,51,0.4)',
    }
  }
  return { background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }
}

function BarraProgreso({ step, tributacion }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      {STEP_LABELS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
            style={estiloPaso(i, step, tributacion)}>
            {i < step
              ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>
              : i + 1}
          </div>
          <span className="text-xs font-medium" style={{ color: i === step ? 'var(--hc-text)' : 'var(--hc-muted)' }}>{label}</span>
          {i < 2 && <div className="h-px w-6 mx-1 rounded transition-all duration-500" style={{ background: step > i ? 'var(--hc-primary)' : 'var(--hc-border)' }} />}
        </div>
      ))}
    </div>
  )
}

export default function RegistroEmpresaPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const loginStore = useAuthStore((s) => s.login)
  const token = useAuthStore((s) => s.token)
  const userRole = useAuthStore((s) => s.userRole)
  const empresaId = useAuthStore((s) => s.empresaId)

  const [step, setStep] = useState(0)
  const [tributacion, setTributacion] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    nombreEmpresa: '', correoEmpresa: '', telefonoEmpresa: '',
    nombreAdmin: '', correoAdmin: '', passwordAdmin: '', telefonoAdmin: '',
  })

  const destino = destinoVender({ tokenVivo: isTokenAlive(token), rol: userRole, empresaId })
  if (destino !== RUTA_REGISTRO_EMPRESA) {
    return <Navigate to={destino} replace />
  }

  const actualizarCampo = (campo) => (evento) => setForm((prev) => ({ ...prev, [campo]: evento.target.value }))

  const handleTributacion = (valor) => {
    setTributacion(valor)
    if (valor) setStep(1)
  }

  const handleNext = (e) => {
    e.preventDefault()
    setError('')
    if (!form.nombreEmpresa.trim()) {
      setError('El nombre del negocio es requerido')
      return
    }
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.correoAdmin.trim()) {
      setError('El correo es requerido')
      return
    }
    if (form.passwordAdmin.length < MIN_PASSWORD) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setLoading(true)
    try {
      const { data } = await authService.registroEmpresa({
        nombreEmpresa:        form.nombreEmpresa.trim(),
        correoEmpresa:        form.correoEmpresa.trim().toLowerCase() || undefined,
        telefonoEmpresa:      form.telefonoEmpresa.trim() || undefined,
        nombreAdmin:          form.nombreAdmin.trim() || undefined,
        correoAdmin:          form.correoAdmin.trim().toLowerCase(),
        passwordAdmin:        form.passwordAdmin,
        telefonoAdmin:        form.telefonoAdmin.trim() || undefined,
        inscritoTributacion:  true,
      })
      if (data?.data) {
        loginStore(data.data)
        toast({ message: '¡Negocio creado! Bienvenido a tu panel.', type: 'success' })
        navigate('/admin')
      }
    } catch (err) {
      const msg = err.response?.data?.message
      setError(typeof msg === 'string' && msg ? msg : 'Error al registrar. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <Seo
      title="Registrá tu emprendimiento — Vendé en HOTCLICK Costa Rica"
      description="Creá tu tienda gratis en HOTCLICK. Sin comisiones el primer mes, tienda activa en 24 horas y acceso a miles de compradores en todo Costa Rica."
      url="https://hotclick.lat/registro-empresa"
    />
    <div className="min-h-screen flex" style={{ fontFamily: 'var(--hc-font-text)' }}>

      <RegistroEmpresaAside />

      <div className="flex-1 flex flex-col overflow-y-auto" style={{ background: 'var(--hc-bg)' }}>

        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--hc-border)' }}>
          <Link to="/" className="flex items-center gap-2.5" style={{ textDecoration: 'none' }}>
            <HotClickMark size={28} className="shrink-0" />
            <span className="hc-wordmark lg:hidden" style={{ fontSize: '1rem' }}>
              <span className="hot">Hot</span><span className="click">Click</span>
            </span>
          </Link>
          <div className="flex items-center gap-2.5">
            <span style={{ color: 'var(--hc-muted)', fontSize: '0.8rem' }}>¿Ya tenés cuenta?</span>
            <Link
              to={rutaLoginConRetorno(RUTA_REGISTRAR_NEGOCIO)}
              className="hc-btn hc-btn-ghost hc-btn-sm"
              style={{ textDecoration: 'none' }}
            >
              Iniciar sesión
            </Link>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center px-5 py-8">

          <div className="text-center mb-8 w-full max-w-[460px]">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4"
              style={{ background: 'rgba(231,59,51,0.08)', border: '1px solid rgba(231,59,51,0.22)', color: 'var(--hc-primary)', letterSpacing: '0.06em' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--hc-primary)] animate-pulse"></span>
              <span>Registro de emprendimiento</span>
            </div>
            <h1 style={{ fontFamily: 'var(--hc-font-display)', fontWeight: 800, fontSize: 'clamp(1.9rem, 5vw, 2.8rem)', color: 'var(--hc-text)', lineHeight: 1.05, marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>
              Registrá tu empresa
            </h1>
            <p style={{ color: 'var(--hc-muted)', fontSize: '0.9rem' }}>
              Cuenta nueva acá. Si ya comprás en HotClick, iniciá sesión y registrá el negocio sin crear otra cuenta.
            </p>
          </div>

          <div className="w-full max-w-[460px]">

            <div style={{
              background: 'var(--hc-surface)', border: '1px solid var(--hc-border)',
              borderRadius: 20, overflow: 'hidden',
              boxShadow: '0 8px 40px var(--hc-shadow)',
            }}>
              <div style={{
                height: 3,
                background: 'linear-gradient(90deg, transparent, var(--hc-primary), transparent)',
              }} />

              <div className="p-6 sm:p-8">

                <div className="mb-6">
                  <h2 style={{ fontFamily: 'var(--hc-font-display)', fontWeight: 800, fontSize: '1.7rem', color: 'var(--hc-text)', lineHeight: 1.1, letterSpacing: '-0.01em' }}>
                    {STEP_TITLES[step]}
                  </h2>
                  <p style={{ color: 'var(--hc-muted)', fontSize: '0.85rem', marginTop: '0.3rem' }}>
                    {STEP_DESCS[step]}
                  </p>
                </div>

                <BarraProgreso step={step} tributacion={tributacion} />

                <AnimatePresence mode="wait">
                  {step === 0 && (
                    <StepTributacion
                      key={tributacion === false ? 's0-blocked' : 's0'}
                      tributacion={tributacion}
                      onInscrito={() => handleTributacion(true)}
                      onNoInscrito={() => handleTributacion(false)}
                      onVolver={() => setTributacion(null)}
                    />
                  )}
                  {step === 1 && (
                    <StepDatosEmpresa
                      key="s1"
                      form={form}
                      error={error}
                      onCampo={actualizarCampo}
                      onTelefono={(val) => setForm((p) => ({ ...p, telefonoEmpresa: val }))}
                      onSubmit={handleNext}
                      onAtras={() => { setStep(0); setTributacion(null); setError('') }}
                    />
                  )}
                  {step === 2 && (
                    <StepDatosAdmin
                      key="s2"
                      form={form}
                      error={error}
                      loading={loading}
                      onCampo={actualizarCampo}
                      onTelefono={(val) => setForm((p) => ({ ...p, telefonoAdmin: val }))}
                      onSubmit={handleSubmit}
                      onAtras={() => { setStep(1); setError('') }}
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>

            <p className="text-center text-xs mt-6" style={{ color: 'var(--hc-muted)' }}>
              © {new Date().getFullYear()} HotClick · Costa Rica ·{' '}
              <Link to="/informacion" className="hover:underline" style={{ color: 'var(--hc-accent)' }}>Términos</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
