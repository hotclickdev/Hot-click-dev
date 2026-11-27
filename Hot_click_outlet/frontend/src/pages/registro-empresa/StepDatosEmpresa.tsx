import { motion } from 'framer-motion'
import Input from '@/components/ui/Input'
import PhoneField from '@/components/ui/PhoneField'
import ErrMsg from '../auth/ErrMsg'
import { STEP_MOTION } from './registroEmpresaHelpers'
import TextoFlecha from '@/components/ui/TextoFlecha'
import UbicacionDespachoFieldset from '@/components/registro/UbicacionDespachoFieldset'
import { WHATSAPP_HOTCLICK, urlWhatsApp } from '@/pages/carrito/cartHelpers'
import type { ChangeEvent, FormEvent } from 'react'
import type { UbicacionDespachoForm } from '@/hooks/useUbicacionDespachoForm'
import type { RegistroEmpresaForm } from './registroEmpresaHelpers'
import { SITUACIONES, type SituacionFiscal } from '@/utils/fiscal'

const MENSAJE_WA_TRIBUTACION =
  'Hola HotClick, quiero vender pero aún no estoy inscrito en Tributación Directa. ¿Me ayudan con el proceso de inscripción?'

const HREF_WA_TRIBUTACION = urlWhatsApp(encodeURIComponent(MENSAJE_WA_TRIBUTACION), WHATSAPP_HOTCLICK)

/**
 * Pregunta obligatoria "¿Estás inscrito en Hacienda?". No bloquea el registro: quien responde "No" se registra igual
 * (paga un extra de comisión hasta inscribirse y puede avisarlo después desde su panel con "Ya me inscribí").
 */
function PreguntaHacienda({ valor, onChange }: { valor: SituacionFiscal | ''; onChange: (v: SituacionFiscal) => void }) {
  return (
    <fieldset className="space-y-2.5" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="text-sm font-semibold mb-2" style={{ color: 'var(--hc-text)' }}>¿Estás inscrito en Hacienda? *</legend>
      {SITUACIONES.map((op) => {
        const activo = valor === op.id
        return (
          <label key={op.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '0.75rem', minHeight: 44,
            borderRadius: 10,
            border: `1px solid ${activo ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
            background: activo ? 'color-mix(in srgb, var(--hc-accent) 5%, transparent)' : 'var(--hc-surface-2)',
            transition: 'all 0.15s',
          }}>
            <input
              type="radio"
              name="situacionFiscal"
              value={op.id}
              checked={activo}
              onChange={() => onChange(op.id)}
              style={{ marginTop: 2, flexShrink: 0, accentColor: 'var(--hc-accent)', width: 16, height: 16, cursor: 'pointer' }}
            />
            <span style={{ fontSize: 12, color: 'var(--hc-muted)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--hc-text)' }}>{op.etiqueta}.</strong> {op.detalle}
            </span>
          </label>
        )
      })}
      {valor === 'NO_INSCRITO' && (
        <p className="text-xs leading-relaxed px-1" style={{ color: 'var(--hc-muted)' }}>
          Podés registrarte igual. Cuando te inscribás, avisalo en tu panel y volvés a la comisión de tu plan.{' '}
          <a href={HREF_WA_TRIBUTACION} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hc-accent)', textDecoration: 'underline' }}>
            Te ayudamos por WhatsApp
          </a> si querés inscribirte ahora.
        </p>
      )}
    </fieldset>
  )
}

export default function StepDatosEmpresa({
  form, ubicacion, error, onCampo, onTelefono, onSituacionFiscalChange, onSubmit,
}: {
  form: RegistroEmpresaForm
  ubicacion: UbicacionDespachoForm
  error: string
  onCampo: (campo: keyof RegistroEmpresaForm) => (evento: ChangeEvent<HTMLInputElement>) => void
  onTelefono: (val: string) => void
  onSituacionFiscalChange: (v: SituacionFiscal) => void
  onSubmit: (e: FormEvent) => void
}) {
  return (
    <motion.form key="s0" {...STEP_MOTION} onSubmit={onSubmit} className="space-y-4">
      <Input label="Nombre del negocio *" placeholder="Ej: Mi Tienda Tica"
        value={form.nombreEmpresa} onChange={onCampo('nombreEmpresa')} required />
      <PreguntaHacienda valor={form.situacionFiscal} onChange={onSituacionFiscalChange} />
      <p className="text-xs leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
        Con el nombre y tu situación ante Hacienda alcanza para empezar. Ubicación, contacto y datos de facturación los completás después en tu panel.
      </p>
      <details className="rounded-[10px] border px-3 py-2" style={{ borderColor: 'var(--hc-border)' }}>
        <summary className="cursor-pointer text-sm font-semibold" style={{ color: 'var(--hc-text)', minHeight: 44, display: 'flex', alignItems: 'center' }}>
          Agregar más datos ahora (opcional)
        </summary>
        <div className="space-y-4 pt-3">
          <Input label="Correo del negocio" type="email" placeholder="contacto@minegocio.com"
            value={form.correoEmpresa} onChange={onCampo('correoEmpresa')} hint="Opcional" />
          <PhoneField label="Teléfono del negocio"
            value={form.telefonoEmpresa} onChange={onTelefono} />
          <UbicacionDespachoFieldset form={ubicacion} />
        </div>
      </details>
      {error && <ErrMsg>{error}</ErrMsg>}
      <button type="submit" className="hc-btn hc-btn-primary hc-btn-lg w-full"
        style={{ background: 'var(--hc-primary)', borderColor: 'var(--hc-primary)', boxShadow: '0 4px 20px rgba(231,59,51,0.3)' }}>
        <TextoFlecha>Siguiente</TextoFlecha>
      </button>
    </motion.form>
  )
}
