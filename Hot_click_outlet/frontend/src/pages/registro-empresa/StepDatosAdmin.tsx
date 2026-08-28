import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Input from '@/components/ui/Input'
import PhoneField from '@/components/ui/PhoneField'
import ErrMsg from '../auth/ErrMsg'
import { MIN_PASSWORD, STEP_MOTION } from './registroEmpresaHelpers'
import TextoFlecha from '@/components/ui/TextoFlecha'
import type { ChangeEvent, FormEvent } from 'react'
import type { RegistroEmpresaForm } from './registroEmpresaHelpers'

export default function StepDatosAdmin({
  form, error, loading, onCampo, onTelefono, onSubmit, onAtras,
}: {
  form: RegistroEmpresaForm
  error: string
  loading: boolean
  onCampo: (campo: keyof RegistroEmpresaForm) => (evento: ChangeEvent<HTMLInputElement>) => void
  onTelefono: (val: string) => void
  onSubmit: (e: FormEvent) => void
  onAtras: () => void
}) {
  return (
    <motion.form key="s2" {...STEP_MOTION} onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-2"
        style={{ background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--hc-muted)' }}>
          Negocio: <strong style={{ color: 'var(--hc-text)' }}>{form.nombreEmpresa}</strong>
        </span>
      </div>
      <Input label="Tu nombre completo" placeholder="Ana García"
        value={form.nombreAdmin} onChange={onCampo('nombreAdmin')} autoFocus />
      <Input label="Tu correo *" type="email" placeholder="ana@miempresa.com"
        value={form.correoAdmin} onChange={onCampo('correoAdmin')} required />
      <Input label="Contraseña *" type="password" placeholder="Mínimo 6 caracteres"
        value={form.passwordAdmin} onChange={onCampo('passwordAdmin')} required minLength={MIN_PASSWORD} />
      <PhoneField label="Teléfono personal"
        value={form.telefonoAdmin} onChange={onTelefono} />
      {error && <ErrMsg>{error}</ErrMsg>}
      <div className="flex gap-2.5">
        <button type="button" onClick={onAtras} className="hc-btn hc-btn-outline px-4">
          <TextoFlecha dir="atras">Atrás</TextoFlecha>
        </button>
        <button type="submit" disabled={loading}
          className="hc-btn hc-btn-primary hc-btn-lg flex-1 disabled:opacity-60"
          style={{ background: 'var(--hc-primary)', borderColor: 'var(--hc-primary)', boxShadow: '0 4px 20px rgba(231,59,51,0.3)' }}>
          {loading
            ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creando…
              </span>
            )
            : '¡Crear mi empresa!'}
        </button>
      </div>
      <p className="text-center text-xs" style={{ color: 'var(--hc-muted)' }}>
        Al registrarte aceptás los{' '}
        <Link to="/informacion" className="underline hover:opacity-80" style={{ color: 'var(--hc-accent)' }}>términos y condiciones</Link>
      </p>
    </motion.form>
  )
}
