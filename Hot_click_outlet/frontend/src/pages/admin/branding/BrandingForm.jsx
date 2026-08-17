import { ColorField, TextField } from './brandingFields'
import { FONTS_BRANDING } from './brandingHelpers'

export default function BrandingForm({ form, set, error, guardando, ok }) {
  return (
    <div className="lg:col-span-2 space-y-5">
      <section className="rounded-2xl p-5 space-y-4"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Identidad</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label="Nombre comercial" fieldId="brand-nombre" value={form.nombreComercial}
            onChange={set('nombreComercial')} placeholder="Mi Tienda" />
          <TextField label="Tagline" fieldId="brand-tagline" value={form.tagline}
            onChange={set('tagline')} placeholder="Tu eslogan aquí" />
        </div>
        <TextField label="Descripción" fieldId="brand-descripcion" value={form.descripcion}
          onChange={set('descripcion')} placeholder="Descripción breve de tu negocio..." multiline />
        <TextField label="Texto del footer" fieldId="brand-footer" value={form.footerTexto}
          onChange={set('footerTexto')} placeholder="© 2026 Mi Tienda · Todos los derechos reservados" />
      </section>

      <section className="rounded-2xl p-5 space-y-4"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Paleta de colores</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ColorField label="Color primario (botones, CTAs)" fieldId="brand-color-primario" value={form.colorPrimario} onChange={set('colorPrimario')} />
          <ColorField label="Color secundario (fondo cards)" fieldId="brand-color-secundario" value={form.colorSecundario} onChange={set('colorSecundario')} />
          <ColorField label="Color acento (links, highlights)" fieldId="brand-color-acento" value={form.colorAcento} onChange={set('colorAcento')} />
        </div>
      </section>

      <section className="rounded-2xl p-5 space-y-4"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Tipografía</p>
        <div className="space-y-1.5">
          <p className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>Fuente principal</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FONTS_BRANDING.map(f => (
              <button key={f} type="button"
                onClick={() => set('fontFamilia')(f)}
                className="py-2 px-3 rounded-xl text-sm transition-all"
                style={{
                  fontFamily: `'${f}', system-ui`,
                  border: `1.5px solid ${form.fontFamilia === f ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
                  backgroundColor: form.fontFamilia === f ? 'rgba(23,71,168,0.08)' : 'var(--hc-bg)',
                  color: 'var(--hc-text)',
                }}>
                {f}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl p-5 space-y-4"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Imágenes y dominio</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label="URL del logo" fieldId="brand-logo" value={form.logoUrl}
            onChange={set('logoUrl')} placeholder="https://..." />
          <TextField label="URL del favicon (.ico / .png)" fieldId="brand-favicon" value={form.faviconUrl}
            onChange={set('faviconUrl')} placeholder="https://..." />
          <TextField label="Imagen Open Graph (1200×630 px)" fieldId="brand-og" value={form.ogImagenUrl}
            onChange={set('ogImagenUrl')} placeholder="https://..." />
          <TextField label="Dominio personalizado (informativo)" fieldId="brand-dominio" value={form.dominioCustom}
            onChange={set('dominioCustom')} placeholder="tienda.midominio.com" />
        </div>
      </section>

      {error && (
        <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
          {error}
        </div>
      )}

      <div className="flex items-center gap-4">
        <button type="submit" disabled={guardando}
          className="px-6 py-3 rounded-xl font-semibold text-sm disabled:opacity-50 hover:opacity-80"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {ok && (
          <span className="text-sm text-emerald-400 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Guardado correctamente
          </span>
        )}
      </div>
    </div>
  )
}
