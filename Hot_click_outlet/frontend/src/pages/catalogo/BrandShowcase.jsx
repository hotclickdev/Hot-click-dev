import CatalogBrandLogo from './CatalogBrandLogo'
import CloseIcon from '@/components/ui/CloseIcon'

// ── Showcase de marcas en grande (reemplaza las pills pequeñas) ───────────────
export default function BrandShowcase({ marcas, visibleMarcaIds, marcasCountInScope = {}, marcasFilter, toggleMarca, clearMarcas, title = 'Compra por Marca' }) {
  const visible = (visibleMarcaIds
    ? marcas.filter(m => visibleMarcaIds.has(String(m.id)))
    : marcas
  ).filter(m => (marcasCountInScope[m.id] ?? 0) > 0)

  if (visible.length === 0) return null

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-black tracking-tight" style={{ color: 'var(--hc-text)' }}>{title}</h2>
          {visibleMarcaIds && (
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--hc-muted)' }}>
              {visible.length} marca{visible.length === 1 ? '' : 's'} disponible{visible.length === 1 ? '' : 's'}
            </p>
          )}
        </div>
        {marcasFilter.size > 0 && (
          <button type="button"
            onClick={clearMarcas}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:opacity-80"
            style={{ color: 'var(--hc-accent)', background: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)' }}
          >
            <CloseIcon className="w-3 h-3" />
            Ver todas
          </button>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
        {visible.map(m => {
          const isActive = marcasFilter.has(String(m.id))
          const count = marcasCountInScope[m.id] ?? 0
          return (
            <button type="button"
              key={m.id}
              onClick={() => toggleMarca(String(m.id))}
              aria-pressed={isActive}
              className="flex-none flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-200 hover:scale-[1.04] active:scale-[0.97]"
              style={{
                width: 108,
                background: isActive
                  ? 'color-mix(in srgb, var(--hc-accent) 12%, var(--hc-surface))'
                  : 'var(--hc-surface)',
                border: isActive
                  ? '2px solid color-mix(in srgb, var(--hc-accent) 45%, transparent)'
                  : '1.5px solid var(--hc-border)',
                boxShadow: isActive
                  ? '0 4px 16px color-mix(in srgb, var(--hc-accent) 18%, transparent)'
                  : '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <CatalogBrandLogo marca={m} size={52} />
              <span
                className="text-[11px] font-semibold text-center leading-tight line-clamp-2 w-full"
                style={{ color: isActive ? 'var(--hc-accent)' : 'var(--hc-text)' }}
              >
                {m.nombreMarca}
              </span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: isActive
                    ? 'color-mix(in srgb, var(--hc-accent) 20%, transparent)'
                    : 'color-mix(in srgb, var(--hc-text) 8%, transparent)',
                  color: isActive ? 'var(--hc-accent)' : 'var(--hc-muted)',
                }}
              >
                {count}
              </span>
              {isActive && (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center -mt-1"
                  style={{ background: 'var(--hc-accent)' }}
                >
                  <svg className="w-3 h-3" fill="none" stroke="#fff" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
