import PhoneField from '@/components/ui/PhoneField'
import Section from './Section'
import Field from './Field'
import LogoUpload from './LogoUpload'
import FotosGallery from './FotosGallery'
import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { ErroresPerfil, FormularioEmpresa } from './miEmpresaHelpers'

export type PerfilFormProps = {
  form: FormularioEmpresa
  setForm: Dispatch<SetStateAction<FormularioEmpresa>>
  errors: ErroresPerfil
  canEdit: boolean
  saving: boolean
  onSubmit: (ev: FormEvent) => void
  logo: {
    uploading: boolean
    onFile: (file?: File) => void
    onQuitar: () => void
  }
  gallery: {
    fotos: string[]
    uploadingFoto: boolean
    onFile: (file?: File) => void
    onEliminar: (i: number) => void
  }
}

export default function PerfilForm({
  form, setForm, errors, canEdit, saving, onSubmit, logo, gallery,
}: PerfilFormProps) {
  const patch = (field: keyof FormularioEmpresa) => (e: { target: { value: string } }) => setForm(s => ({ ...s, [field]: e.target.value }))

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Section title="Información pública">
        <Field label="Nombre comercial" error={errors.nombreComercial} required>
          <input
            value={form.nombreComercial}
            onChange={patch('nombreComercial')}
            disabled={!canEdit}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none disabled:opacity-60"
            style={{ backgroundColor: 'var(--hc-surface-2)', border: `1px solid ${errors.nombreComercial ? '#ef4444' : 'var(--hc-border)'}`, color: 'var(--hc-text)' }}
          />
        </Field>
        <Field label="Descripción" error={errors.descripcion}>
          <textarea
            value={form.descripcion}
            onChange={patch('descripcion')}
            rows={3}
            disabled={!canEdit}
            placeholder="Describe brevemente tu negocio y lo que ofrecés…"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none disabled:opacity-60"
            style={{ backgroundColor: 'var(--hc-surface-2)', border: `1px solid ${errors.descripcion ? '#ef4444' : 'var(--hc-border)'}`, color: 'var(--hc-text)' }}
          />
        </Field>
      </Section>

      <Section title="Contacto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Correo del negocio">
            <input
              type="email"
              value={form.correoEmpresa}
              onChange={patch('correoEmpresa')}
              disabled={!canEdit}
              placeholder="contacto@minegocio.com"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none disabled:opacity-60"
              style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
            />
          </Field>
          <Field label="Teléfono del negocio">
            <PhoneField
              value={form.telefonoEmpresa}
              onChange={(val) => setForm(s => ({ ...s, telefonoEmpresa: val }))}
              disabled={!canEdit}
            />
          </Field>
          <Field label="WhatsApp" hint="Formato: 50688880000 (código país + número)">
            <input
              value={form.numeroWhatsapp}
              onChange={patch('numeroWhatsapp')}
              disabled={!canEdit}
              placeholder="50688880000"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none disabled:opacity-60"
              style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
            />
          </Field>
        </div>
      </Section>

      <Section title="Identidad visual">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Color primario">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.colorPrimario}
                onChange={patch('colorPrimario')}
                disabled={!canEdit}
                className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0.5 disabled:opacity-60"
                style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}
              />
              <input
                value={form.colorPrimario}
                onChange={patch('colorPrimario')}
                disabled={!canEdit}
                className="flex-1 px-3 py-2.5 rounded-xl text-sm font-mono outline-none disabled:opacity-60"
                style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
              />
            </div>
          </Field>
          <Field label="Color secundario">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.colorSecundario}
                onChange={patch('colorSecundario')}
                disabled={!canEdit}
                className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0.5 disabled:opacity-60"
                style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}
              />
              <input
                value={form.colorSecundario}
                onChange={patch('colorSecundario')}
                disabled={!canEdit}
                className="flex-1 px-3 py-2.5 rounded-xl text-sm font-mono outline-none disabled:opacity-60"
                style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
              />
            </div>
          </Field>
        </div>
        <LogoUpload
          logoUrl={form.logoUrl}
          canEdit={canEdit}
          uploading={logo.uploading}
          onFile={logo.onFile}
          onQuitar={logo.onQuitar}
        />
      </Section>

      <FotosGallery
        fotos={gallery.fotos}
        canEdit={canEdit}
        uploadingFoto={gallery.uploadingFoto}
        onFile={gallery.onFile}
        onEliminar={gallery.onEliminar}
      />

      {canEdit && (
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      )}
    </form>
  )
}
