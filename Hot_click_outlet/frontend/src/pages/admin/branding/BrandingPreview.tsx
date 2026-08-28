import { COLOR_PRIMARIO_DEF, COLOR_SECUNDARIO_DEF, inicialNombre, pieVistaPrevia, type BrandingFormulario } from './brandingHelpers'

export default function BrandingPreview({ form }: { form: BrandingFormulario }) {
  const primario = form.colorPrimario || COLOR_PRIMARIO_DEF
  const secundario = form.colorSecundario || COLOR_SECUNDARIO_DEF
  return (
    <div className="lg:col-span-1">
      <div className="sticky top-24 rounded-2xl p-4 space-y-3"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--hc-muted)' }}>Vista previa</p>

        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--hc-border)' }}>
          <div className="px-4 py-3 flex items-center gap-3"
            style={{ backgroundColor: secundario }}>
            {form.logoUrl ? (
              <img src={form.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
                style={{ backgroundColor: primario, color: '#fff' }}>
                {inicialNombre(form.nombreComercial)}
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

          <div className="p-3 grid grid-cols-2 gap-2" style={{ backgroundColor: '#0f0f17' }}>
            {[1, 2].map(i => (
              <div key={i} className="rounded-lg overflow-hidden" style={{ backgroundColor: secundario }}>
                <div className="h-16" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
                <div className="p-2 space-y-1">
                  <div className="h-2 rounded-full w-3/4 bg-white/20" />
                  <p className="text-[10px] font-bold" style={{ color: primario }}>
                    ₡12.500
                  </p>
                  <div className="h-5 rounded-lg flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ backgroundColor: primario }}>
                    Agregar
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="px-3 py-2 text-center text-[9px]"
            style={{ backgroundColor: secundario, color: 'rgba(255,255,255,0.4)' }}>
            {pieVistaPrevia(form)}
          </div>
        </div>

        <div className="p-3 rounded-xl space-y-1" style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)' }}>
          <p className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>Tipografía</p>
          <p className="text-base font-bold" style={{ fontFamily: `'${form.fontFamilia}', sans-serif`, color: 'var(--hc-text)' }}>
            {form.fontFamilia || 'Inter'}
          </p>
          <p className="text-xs" style={{ fontFamily: `'${form.fontFamilia}', sans-serif`, color: 'var(--hc-muted)' }}>
            HotClick · E-commerce para emprendedores
          </p>
        </div>

        <div className="flex gap-2">
          {[form.colorPrimario, form.colorSecundario, form.colorAcento].map((c, i) => (
            <div key={i} className="flex-1 h-8 rounded-lg"
              style={{ backgroundColor: c || '#333', border: '1px solid rgba(255,255,255,0.1)' }}
              title={c} />
          ))}
        </div>
      </div>
    </div>
  )
}
