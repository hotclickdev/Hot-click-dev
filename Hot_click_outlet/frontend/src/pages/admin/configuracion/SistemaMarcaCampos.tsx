import type { ChangeEvent, Dispatch, SetStateAction } from 'react'
import Field from '@/pages/admin/mi-empresa/Field'
import LogoUpload from '@/pages/admin/mi-empresa/LogoUpload'
import { FOOTER_MAX, TAGLINE_MAX, type ErroresMarca, type MarcaForm } from './sistemaMarcaHelpers'

const INPUT = {
  backgroundColor: 'var(--hc-surface-2)',
  border: '1px solid var(--hc-border)',
  color: 'var(--hc-text)',
}

/**
 * Campos que el comprador ve en `/tienda/:slug`.
 * @param {{ form: object, setForm: Function, errors: object, uploading: boolean, onLogoFile: Function, onQuitarLogo: Function }} props
 */
export default function SistemaMarcaCampos({ form, setForm, errors, uploading, onLogoFile, onQuitarLogo }: {
  form: MarcaForm
  setForm: Dispatch<SetStateAction<MarcaForm>>
  errors: ErroresMarca
  uploading: boolean
  onLogoFile: (file: File | undefined) => void
  onQuitarLogo: () => void
}) {
  const patch = (campo: keyof MarcaForm) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((s) => ({ ...s, [campo]: e.target.value }))
  return (
    <>
      <Field label="Nombre comercial" error={errors.nombreComercial} required>
        <input
          id="marca-nombre"
          aria-label="Nombre comercial"
          value={form.nombreComercial}
          onChange={patch('nombreComercial')}
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none min-h-11"
          style={bordeError(errors.nombreComercial)}
        />
      </Field>
      <Field label="Frase bajo el nombre" error={errors.tagline} hint={`La ven en tu tienda. Máx. ${TAGLINE_MAX}.`}>
        <input
          id="marca-tagline"
          aria-label="Frase bajo el nombre"
          value={form.tagline}
          onChange={patch('tagline')}
          maxLength={TAGLINE_MAX}
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none min-h-11"
          style={INPUT}
        />
      </Field>
      <Field label="WhatsApp" error={errors.numeroWhatsapp} hint="Código de país + número, ej. 50688880000">
        <input
          id="marca-whatsapp"
          aria-label="WhatsApp"
          value={form.numeroWhatsapp}
          onChange={patch('numeroWhatsapp')}
          inputMode="tel"
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none min-h-11"
          style={INPUT}
        />
      </Field>
      <LogoUpload
        logoUrl={form.logoUrl}
        canEdit
        uploading={uploading}
        onFile={onLogoFile}
        onQuitar={onQuitarLogo}
      />
      <ColoresMarca form={form} patch={patch} />
      <Field label="Texto extra del pie" error={errors.footerTexto} hint={`Opcional. Máx. ${FOOTER_MAX}.`}>
        <textarea
          id="marca-footer"
          aria-label="Texto extra del pie"
          value={form.footerTexto}
          onChange={patch('footerTexto')}
          maxLength={FOOTER_MAX}
          rows={2}
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
          style={INPUT}
        />
      </Field>
    </>
  )
}

function ColoresMarca({ form, patch }: {
  form: MarcaForm
  patch: (campo: keyof MarcaForm) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <ColorCampo label="Color primario" value={form.colorPrimario} onChange={patch('colorPrimario')} />
      <ColorCampo label="Color secundario" value={form.colorSecundario} onChange={patch('colorSecundario')} />
      <ColorCampo
        label="Color de acento"
        value={form.colorAcento}
        onChange={patch('colorAcento')}
        hint="Enlaces y foco en tu tienda"
      />
    </div>
  )
}

function ColorCampo({ label, value, onChange, hint }: {
  label: string
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  hint?: string
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={label}
          value={value}
          onChange={onChange}
          className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0.5"
        />
        <input
          aria-label={`${label} hex`}
          value={value}
          onChange={onChange}
          className="flex-1 px-3 py-2.5 rounded-xl text-sm font-mono outline-none min-h-11"
          style={INPUT}
        />
      </div>
    </Field>
  )
}

function bordeError(error?: string) {
  return { ...INPUT, border: `1px solid ${error ? '#ef4444' : 'var(--hc-border)'}` }
}
