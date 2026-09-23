import { motion } from 'framer-motion'
import Input from '@/components/ui/Input'
import PhoneField from '@/components/ui/PhoneField'
import ErrMsg from '../auth/ErrMsg'
import { STEP_MOTION } from './registroEmpresaHelpers'
import TextoFlecha from '@/components/ui/TextoFlecha'
import { WHATSAPP_HOTCLICK, urlWhatsApp } from '@/pages/carrito/cartHelpers'
import type { ChangeEvent, FormEvent } from 'react'
import type { RegistroEmpresaForm } from './registroEmpresaHelpers'

const MENSAJE_WA_TRIBUTACION =
  'Hola HotClick, quiero vender pero aún no estoy inscrito en Tributación Directa. ¿Me ayudan con el proceso de inscripción?'

const HREF_WA_TRIBUTACION = urlWhatsApp(encodeURIComponent(MENSAJE_WA_TRIBUTACION), WHATSAPP_HOTCLICK)

/**
 * Aviso no bloqueante (P1-06): antes esto era un paso 0 separado que
 * dejaba al vendedor en un callejón de WhatsApp si respondía "No". Ahora
 * es una casilla autodeclarada en el mismo paso de datos del negocio —
 * el registro sigue igual, marcada o no.
 */
function AvisoTributacion({ inscrito, onChange }: { inscrito: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="space-y-2.5">
      <label style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '0.75rem',
        borderRadius: 10,
        border: `1px solid ${inscrito ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
        background: inscrito ? 'color-mix(in srgb, var(--hc-accent) 5%, transparent)' : 'var(--hc-surface-2)',
        transition: 'all 0.15s',
      }}>
        <input
          type="checkbox"
          checked={inscrito}
          onChange={(e) => onChange(e.target.checked)}
          style={{ marginTop: 2, flexShrink: 0, accentColor: 'var(--hc-accent)', width: 16, height: 16, cursor: 'pointer' }}
        />
        <span style={{ fontSize: 12, color: 'var(--hc-muted)', lineHeight: 1.6 }}>
          Estoy inscrito en <strong style={{ color: 'var(--hc-text)' }}>Tributación Directa (ATV)</strong> y puedo emitir facturas electrónicas.
        </span>
      </label>
      {!inscrito && (
        <p className="text-xs leading-relaxed px-1" style={{ color: 'var(--hc-muted)' }}>
          Podés registrarte igual y ponerte al día después.{' '}
          <a href={HREF_WA_TRIBUTACION} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hc-accent)', textDecoration: 'underline' }}>
            Te ayudamos por WhatsApp
          </a> si querés inscribirte ahora.
        </p>
      )}
    </div>
  )
}

export default function StepDatosEmpresa({
  form, error, onCampo, onTelefono, onInscritoTributacionChange, onSubmit,
}: {
  form: RegistroEmpresaForm
  error: string
  onCampo: (campo: keyof RegistroEmpresaForm) => (evento: ChangeEvent<HTMLInputElement>) => void
  onTelefono: (val: string) => void
  onInscritoTributacionChange: (v: boolean) => void
  onSubmit: (e: FormEvent) => void
}) {
  return (
    <motion.form key="s0" {...STEP_MOTION} onSubmit={onSubmit} className="space-y-4">
      <Input label="Nombre del negocio *" placeholder="Ej: Mi Tienda Tica"
        value={form.nombreEmpresa} onChange={onCampo('nombreEmpresa')} required />
      <Input label="Correo del negocio" type="email" placeholder="contacto@minegocio.com"
        value={form.correoEmpresa} onChange={onCampo('correoEmpresa')} hint="Opcional" />
      <PhoneField label="Teléfono del negocio"
        value={form.telefonoEmpresa} onChange={onTelefono} />
      <AvisoTributacion inscrito={form.inscritoTributacion} onChange={onInscritoTributacionChange} />
      {error && <ErrMsg>{error}</ErrMsg>}
      <button type="submit" className="hc-btn hc-btn-primary hc-btn-lg w-full"
        style={{ background: 'var(--hc-primary)', borderColor: 'var(--hc-primary)', boxShadow: '0 4px 20px rgba(231,59,51,0.3)' }}>
        <TextoFlecha>Siguiente</TextoFlecha>
      </button>
    </motion.form>
  )
}
