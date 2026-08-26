import CharCounter from '../nuevo-producto/CharCounter'
import { toSlug } from '../nuevo-producto/toSlug'
import { ta, inpStyle as taStyle } from '../nuevo-producto/productFormUi'
import { setField } from './productoFormCampos'
import TrustGlyph from '@/components/ui/TrustGlyph'
import TextoCamino from '@/components/ui/TextoCamino'

function TargetIcon() {
  return (
    <svg className="w-4 h-4" style={{ color: 'var(--hc-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  )
}

export default function BloqueSeo({
  form, setForm, seoOpen, setSeoOpen, seoAutoTitle, setSeoAutoTitle, seoAutoDesc, setSeoAutoDesc,
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--hc-border)' }}>
      <button
        type="button"
        onClick={() => setSeoOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--hc-surface-2)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>SEO</span>
          <TargetIcon />
          {form.metaTitle && form.metaDescription
            ? <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: '#1E7F4F', backgroundColor: '#e2f1e8' }}>Optimizado</span>
            : <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: 'var(--hc-muted)', backgroundColor: 'var(--hc-surface-2)' }}>Sin configurar</span>
          }
        </div>
        <svg className={`w-4 h-4 transition-transform duration-200 ${seoOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--hc-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      {seoOpen && (
        <div className="px-4 py-4 space-y-4" style={{ borderTop: '1px solid var(--hc-border)' }}>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>Título SEO</label>
                <span title="Aparece en Google. Usa entre 50-60 caracteres, incluye la palabra principal." className="cursor-help" style={{ color: 'var(--hc-muted)' }}>
                  <TrustGlyph tipo="info" className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex items-center gap-2">
                {seoAutoTitle && <span className="text-[10px]" style={{ color: 'var(--hc-accent)' }}>auto</span>}
                <CharCounter current={(form.metaTitle || '').length} max={60} min={30} />
              </div>
            </div>
            <input
              value={form.metaTitle || ''}
              maxLength={60}
              placeholder="Nombre del producto | HotClick Outlet"
              onChange={(e) => { setSeoAutoTitle(false); setField(setForm, 'metaTitle', e.target.value) }}
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
              style={taStyle}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>Meta Descripción</label>
                <span title="Aparece debajo del título en Google. Usa entre 120-160 caracteres." className="cursor-help" style={{ color: 'var(--hc-muted)' }}>
                  <TrustGlyph tipo="info" className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex items-center gap-2">
                {seoAutoDesc && <span className="text-[10px]" style={{ color: 'var(--hc-accent)' }}>auto</span>}
                <CharCounter current={(form.metaDescription || '').length} max={160} min={120} />
              </div>
            </div>
            <textarea
              value={form.metaDescription || ''}
              maxLength={160}
              rows={3}
              placeholder="Descripción del producto | Precio: ₡X | Envíos a todo Costa Rica"
              onChange={(e) => { setSeoAutoDesc(false); setField(setForm, 'metaDescription', e.target.value) }}
              className={`${ta} resize-none`}
              style={taStyle}
            />
          </div>

          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--hc-muted)' }}>Vista previa en Google</p>
            <div className="rounded-xl bg-white px-4 py-3 space-y-0.5">
              <p className="text-xs text-green-700 truncate">
                <TextoCamino
                  partes={['hotclick.com', 'productos', form.nombre ? toSlug(form.nombre) : '…']}
                  iconClassName="w-3 h-3 shrink-0"
                />
              </p>
              <p className="text-base text-blue-700 truncate leading-snug">
                {form.metaTitle || 'Título SEO del producto'}
              </p>
              <p className="text-sm text-[#4d5156] line-clamp-2 leading-snug">
                {form.metaDescription || 'La meta descripción aparecerá aquí…'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
