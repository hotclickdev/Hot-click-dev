import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import PhoneField from '@/components/ui/PhoneField'
import Input from '@/components/ui/Input'
import { Turnstile } from '@marsidev/react-turnstile'
import ErrMsg from '../ErrMsg'
import TextoFlecha from '@/components/ui/TextoFlecha'
import type { ChangeEvent, Dispatch, FormEvent, RefObject, SetStateAction } from 'react'
import type { TurnstileInstance } from '@marsidev/react-turnstile'
import type { FormEmprendimiento } from '../EmprendimientoForm'

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

/**
 * Paso 1 — datos de la cuenta admin. El submit vive en el padre (auth congelado).
 */
export default function EmprendimientoPasoCuenta({
  form, error, loading, aceptaTerminos, turnstileToken, turnstileRef,
  actualizarCampo, setForm, setAceptaTerminos, setTurnstileToken,
  onSubmit, onAtras,
}: {
  form: FormEmprendimiento
  error: string
  loading: boolean
  aceptaTerminos: boolean
  turnstileToken: string
  turnstileRef: RefObject<TurnstileInstance | null>
  actualizarCampo: (field: keyof FormEmprendimiento) => (e: ChangeEvent<HTMLInputElement>) => void
  setForm: Dispatch<SetStateAction<FormEmprendimiento>>
  setAceptaTerminos: Dispatch<SetStateAction<boolean>>
  setTurnstileToken: Dispatch<SetStateAction<string>>
  onSubmit: (e: FormEvent) => void
  onAtras: () => void
}) {
  return (
    <motion.form key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}
      onSubmit={onSubmit} className="space-y-4">
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
          options={{ appearance: 'invisible' as 'always' }}
        />
      )}

      <div className="flex gap-2.5">
        <button type="button" onClick={onAtras} className="hc-btn hc-btn-outline px-4">
          <TextoFlecha dir="atras">Atrás</TextoFlecha>
        </button>
        <button type="submit" disabled={loading || !aceptaTerminos || (!!TURNSTILE_SITE_KEY && !turnstileToken)}
          className="hc-btn hc-btn-primary hc-btn-lg flex-1 disabled:opacity-60"
          style={{ background: 'var(--hc-primary)', borderColor: 'var(--hc-primary)', boxShadow: '0 4px 20px rgba(231,59,51,0.3)' }}>
          {loading
            ? <span className="flex items-center gap-2"><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Creando…</span>
            : <TextoFlecha>Crear mi negocio</TextoFlecha>}
        </button>
      </div>
    </motion.form>
  )
}
