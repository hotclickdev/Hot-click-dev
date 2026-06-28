import { useState, useEffect } from 'react'
import api from '@/services/api'
import { applyBranding, invalidateBrandingCache } from '@/hooks/useBranding'

const FONTS = ['Inter', 'Poppins', 'Roboto', 'Nunito', 'Montserrat', 'Raleway', 'Lato', 'Open Sans']

function ColorField({ label, value, onChange, fieldId }) {
  const textId = fieldId ? `${fieldId}-hex` : undefined
  return (
    <div className="space-y-1.5">
      <label htmlFor={textId} className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value || '#000000'}
          onChange={e => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border-0 cursor-pointer bg-transparent p-0.5"
          style={{ border: '1px solid var(--hc-border)' }} />
        <input id={textId} type="text" value={value || ''}
          onChange={e => onChange(e.target.value)}
          maxLength={7}
          placeholder="#E73B33"
          className="flex-1 px-3 py-2 rounded-xl text-sm font-mono outline-none"
          style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
      </div>
    </div>
  )
}

function TextField({ label, value, onChange, placeholder, multiline, fieldId }) {
  const Tag = multiline ? 'textarea' : 'input'
  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>{label}</label>
      <Tag id={fieldId} rows={multiline ? 3 : undefined}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
        style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
    </div>
  )
}

export default function AdminBranding() {
  const [form, setForm]       = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [ok, setOk]           = useState(false)
  const [error, setError]     = useState(null)

  useEffect(() => {
    api.get('/admin/branding').then(({ data }) => setForm(data))
      .catch(() => setError('No se pudo cargar la configuración'))
      .finally(() => setCargando(false))
  }, [])

  const set = (key) => (val) => setForm(p => ({ ...p, [key]: val }))

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true); setOk(false); setError(null)
    try {
      const { data } = await api.put('/admin/branding', form)
      setForm(data)
      invalidateBrandingCache()
      applyBranding(data)
      setOk(true)
      setTimeout(() => setOk(false), 3000)
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al guardar')
    } finally { setGuardando(false) }
  }

  if (cargando) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
    </div>
  )

  if (!form) return <div className="p-6 text-red-400">{error}</div>

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>Branding / White Label</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
          Personaliza los colores, tipografía e identidad visual de tu tienda
        </p>
      </div>

      <form onSubmit={guardar} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Configuración ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Identidad */}
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

          {/* Colores */}
          <section className="rounded-2xl p-5 space-y-4"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Paleta de colores</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ColorField label="Color primario (botones, CTAs)" fieldId="brand-color-primario" value={form.colorPrimario} onChange={set('colorPrimario')} />
              <ColorField label="Color secundario (fondo cards)" fieldId="brand-color-secundario" value={form.colorSecundario} onChange={set('colorSecundario')} />
              <ColorField label="Color acento (links, highlights)" fieldId="brand-color-acento" value={form.colorAcento} onChange={set('colorAcento')} />
            </div>
          </section>

          {/* Tipografía */}
          <section className="rounded-2xl p-5 space-y-4"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Tipografía</p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>Fuente principal</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FONTS.map(f => (
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

          {/* URLs de imágenes */}
          <section className="rounded-2xl p-5 space-y-4"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Imágenes y dominio</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField label="URL del logo" value={form.logoUrl}
                onChange={set('logoUrl')} placeholder="https://..." />
              <TextField label="URL del favicon (.ico / .png)" value={form.faviconUrl}
                onChange={set('faviconUrl')} placeholder="https://..." />
              <TextField label="Imagen Open Graph (1200×630 px)" value={form.ogImagenUrl}
                onChange={set('ogImagenUrl')} placeholder="https://..." />
              <TextField label="Dominio personalizado (informativo)" value={form.dominioCustom}
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

        {/* ── Preview ── */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl p-4 space-y-3"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--hc-muted)' }}>Vista previa</p>

            {/* Mini store preview */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--hc-border)' }}>
              {/* Header */}
              <div className="px-4 py-3 flex items-center gap-3"
                style={{ backgroundColor: form.colorSecundario || '#1E242E' }}>
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
                    style={{ backgroundColor: form.colorPrimario || '#E73B33', color: '#fff' }}>
                    {(form.nombreComercial || 'T')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-white leading-none">
                    {form.nombreComercial || 'Mi Tienda'}
                  </p>
                  {form.tagline && (
                    <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{form.tagline}</p>
                  )}
                </div>
              </div>

              {/* Product cards mock */}
              <div className="p-3 grid grid-cols-2 gap-2" style={{ backgroundColor: '#0f0f17' }}>
                {[1, 2].map(i => (
                  <div key={i} className="rounded-lg overflow-hidden" style={{ backgroundColor: form.colorSecundario || '#1E242E' }}>
                    <div className="h-16" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
                    <div className="p-2 space-y-1">
                      <div className="h-2 rounded-full w-3/4 bg-white/20" />
                      <p className="text-[10px] font-bold" style={{ color: form.colorPrimario || '#E73B33' }}>
                        ₡12.500
                      </p>
                      <div className="h-5 rounded-lg flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ backgroundColor: form.colorPrimario || '#E73B33' }}>
                        Agregar
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-3 py-2 text-center text-[9px]"
                style={{ backgroundColor: form.colorSecundario || '#1E242E', color: 'rgba(255,255,255,0.4)' }}>
                {form.footerTexto || `© 2026 ${form.nombreComercial || 'Mi Tienda'}`}
              </div>
            </div>

            {/* Font preview */}
            <div className="p-3 rounded-xl space-y-1" style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)' }}>
              <p className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>Tipografía</p>
              <p className="text-base font-bold" style={{ fontFamily: `'${form.fontFamilia}', sans-serif`, color: 'var(--hc-text)' }}>
                {form.fontFamilia || 'Inter'}
              </p>
              <p className="text-xs" style={{ fontFamily: `'${form.fontFamilia}', sans-serif`, color: 'var(--hc-muted)' }}>
                HotClick · E-commerce para emprendedores
              </p>
            </div>

            {/* Color swatches */}
            <div className="flex gap-2">
              {[form.colorPrimario, form.colorSecundario, form.colorAcento].map((c, i) => (
                <div key={i} className="flex-1 h-8 rounded-lg"
                  style={{ backgroundColor: c || '#333', border: '1px solid rgba(255,255,255,0.1)' }}
                  title={c} />
              ))}
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
