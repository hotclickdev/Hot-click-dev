import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import AuthLayout from '@/layouts/AuthLayout'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { authService } from '@/services/authService'
import { useToast } from '@/components/ui/Toast'

export default function RegisterPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { t } = useTranslation()

  const [step, setStep]                 = useState('form')   // 'form' | 'verify' | 'success'
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [correoRegistro, setCorreoRegistro] = useState('')
  const [codigo, setCodigo]             = useState('')
  const [form, setForm] = useState({
    nombre: '', apellidoPaterno: '', apellidoMaterno: '',
    correo: '', telefono: '', identificacion: '', contrasenaHash: '',
  })

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  // Paso 1 — enviar formulario y código al correo
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.contrasenaHash.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setError('')
    setLoading(true)
    try {
      await authService.sendVerification(form)
      setCorreoRegistro(form.correo)
      setStep('verify')
    } catch (err) {
      const msg = err.response?.data?.message
      setError(typeof msg === 'string' && msg ? msg : 'Error al enviar el código. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // Paso 2 — verificar código
  const handleVerify = async (e) => {
    e.preventDefault()
    if (codigo.trim().length !== 6) { setError('El código tiene 6 dígitos'); return }
    setError('')
    setLoading(true)
    try {
      await authService.verifyRegistration(correoRegistro, codigo.trim())
      setStep('success')
    } catch (err) {
      const msg = err.response?.data?.message
      setError(typeof msg === 'string' && msg ? msg : 'Código incorrecto o expirado')
    } finally {
      setLoading(false)
    }
  }

  // Reenviar código (volver al paso 1 con los datos actuales)
  const handleReenviar = async () => {
    setError('')
    setLoading(true)
    try {
      await authService.sendVerification(form)
      toast({ message: 'Código reenviado a tu correo', type: 'success' })
      setCodigo('')
    } catch {
      setError('No se pudo reenviar. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // ── Éxito ────────────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <AuthLayout>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', boxShadow: '0 24px 64px color-mix(in srgb, var(--hc-shadow) 60%, transparent)' }}
        >
          <div className="h-0.5"
            style={{ background: 'linear-gradient(90deg, transparent, var(--hc-success), transparent)' }} />
          <div className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--hc-text)' }}>¡Cuenta creada!</h2>
          <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
            Tu cuenta fue verificada y creada exitosamente. Ya podés iniciar sesión.
          </p>
          <Button onClick={() => navigate('/login')} className="w-full">
            Ir al inicio de sesión
          </Button>
          </div>
        </motion.div>
      </AuthLayout>
    )
  }

  // ── Paso 2: Verificar código ─────────────────────────────────────────────────
  if (step === 'verify') {
    return (
      <AuthLayout>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', boxShadow: '0 24px 64px color-mix(in srgb, var(--hc-shadow) 60%, transparent)' }}
        >
          <div className="h-0.5"
            style={{ background: 'linear-gradient(90deg, transparent, var(--hc-accent), color-mix(in srgb, var(--hc-accent) 60%, #a78bfa), transparent)' }} />
          <div className="p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-[#4f7cff]/15 border border-[#4f7cff]/25 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#4f7cff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[#e8e8ed] mb-1">Verificá tu correo</h1>
            <p className="text-sm text-[#8e8e9a]">
              Enviamos un código de 6 dígitos a{' '}
              <span className="text-[#e8e8ed] font-medium">{correoRegistro}</span>
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#8e8e9a] mb-1.5">Código de verificación</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                autoFocus
                className="w-full text-center text-3xl font-bold tracking-[0.5em] py-4 px-4
                  bg-[#1c1c20] border border-white/10 rounded-xl text-[#e8e8ed]
                  focus:outline-none focus:border-[#4f7cff] focus:ring-1 focus:ring-[#4f7cff]/40
                  placeholder:text-[#3a3a45] transition-colors"
              />
            </div>

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
              Verificar cuenta
            </Button>
          </form>

          <div className="mt-5 text-center space-y-2">
            <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
              ¿No llegó el correo?{' '}
              <button
                onClick={handleReenviar}
                disabled={loading}
                className="hc-underline-hover disabled:opacity-50"
                style={{ color: 'var(--hc-accent)' }}
              >
                Reenviar código
              </button>
            </p>
            <p className="text-xs">
              <button onClick={() => { setStep('form'); setError('') }} style={{ color: 'var(--hc-muted)' }}>
                ← Volver al formulario
              </button>
            </p>
          </div>
          </div>
        </motion.div>
      </AuthLayout>
    )
  }

  // ── Paso 1: Formulario de registro ───────────────────────────────────────────
  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', boxShadow: '0 24px 64px color-mix(in srgb, var(--hc-shadow) 60%, transparent)' }}
      >
        <div className="h-0.5"
          style={{ background: 'linear-gradient(90deg, transparent, var(--hc-accent), color-mix(in srgb, var(--hc-accent) 60%, #a78bfa), transparent)' }} />
        <div className="p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--hc-text)' }}>{t('register.title')}</h1>
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>{t('register.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nombre *" value={form.nombre} onChange={set('nombre')} required placeholder="Juan" />
            <Input label="Apellido *" value={form.apellidoPaterno} onChange={set('apellidoPaterno')} required placeholder="Pérez" />
          </div>
          <Input label="Apellido materno" value={form.apellidoMaterno} onChange={set('apellidoMaterno')} placeholder="Opcional" />
          <Input label="Correo *" type="email" value={form.correo} onChange={set('correo')} required placeholder="tu@email.com" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Teléfono *" type="tel" value={form.telefono} onChange={set('telefono')} required placeholder="8888-8888" />
            <Input label="Identificación *" value={form.identificacion} onChange={set('identificacion')} required placeholder="1-2345-6789" />
          </div>
          <Input
            label="Contraseña *" type="password"
            value={form.contrasenaHash} onChange={set('contrasenaHash')}
            required minLength={6} placeholder="Mínimo 6 caracteres" hint="Mínimo 6 caracteres"
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
            Enviar código de verificación
          </Button>
        </form>

        <p className="text-center text-xs mt-5" style={{ color: 'var(--hc-muted)' }}>
          {t('register.alreadyAccount')}{' '}
          <Link to="/login" className="hc-underline-hover" style={{ color: 'var(--hc-accent)' }}>{t('register.login')}</Link>
        </p>
        </div>
      </motion.div>
    </AuthLayout>
  )
}
