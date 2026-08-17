import { catSvgIcon } from './catalogoHelpers'

// ── Cuadrícula de categorías hijas (Cajas Hijas) ─────────────────────────────
export default function SubcategoryGrid({ subcats, onSelect, productCountByCat }) {
  if (!subcats || subcats.length === 0) return null

  const PALETTE = [
    { bg: 'color-mix(in srgb, #3b82f6 9%, var(--hc-surface))', border: 'color-mix(in srgb, #3b82f6 22%, transparent)', icon: '#3b82f6' },
    { bg: 'color-mix(in srgb, #8b5cf6 9%, var(--hc-surface))', border: 'color-mix(in srgb, #8b5cf6 22%, transparent)', icon: '#8b5cf6' },
    { bg: 'color-mix(in srgb, #10b981 9%, var(--hc-surface))', border: 'color-mix(in srgb, #10b981 22%, transparent)', icon: '#10b981' },
    { bg: 'color-mix(in srgb, #f59e0b 9%, var(--hc-surface))', border: 'color-mix(in srgb, #f59e0b 22%, transparent)', icon: '#f59e0b' },
    { bg: 'color-mix(in srgb, #ef4444 9%, var(--hc-surface))', border: 'color-mix(in srgb, #ef4444 22%, transparent)', icon: '#ef4444' },
    { bg: 'color-mix(in srgb, #06b6d4 9%, var(--hc-surface))', border: 'color-mix(in srgb, #06b6d4 22%, transparent)', icon: '#06b6d4' },
    { bg: 'color-mix(in srgb, #ec4899 9%, var(--hc-surface))', border: 'color-mix(in srgb, #ec4899 22%, transparent)', icon: '#ec4899' },
    { bg: 'color-mix(in srgb, #14b8a6 9%, var(--hc-surface))', border: 'color-mix(in srgb, #14b8a6 22%, transparent)', icon: '#14b8a6' },
  ]

  return (
    <div className="mb-8">
      <div className="mb-5">
        <h2 className="text-base font-black tracking-tight" style={{ color: 'var(--hc-text)' }}>
          Subcategorías
        </h2>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--hc-muted)' }}>
          Seleccioná una para ver sus productos
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {subcats.filter(sub => (productCountByCat[sub.id] ?? 0) > 0).map((sub, idx) => {
          const count = productCountByCat[sub.id] ?? 0
          const c = PALETTE[idx % PALETTE.length]
          const name = sub.nombreCategoria ?? sub.nombre ?? ''
          return (
            <button type="button"
              key={sub.id}
              onClick={() => onSelect(String(sub.id))}
              className="group flex flex-col items-start p-4 rounded-2xl text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
              style={{ background: c.bg, border: `1.5px solid ${c.border}` }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 text-xl leading-none shrink-0"
                style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(4px)' }}
              >
                {sub.icono ? (
                  <span>{sub.icono}</span>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke={c.icon} strokeWidth={1.6} viewBox="0 0 24 24">
                    {catSvgIcon(name)}
                  </svg>
                )}
              </div>
              <span className="text-sm font-bold leading-snug mb-1" style={{ color: 'var(--hc-text)' }}>
                {name}
              </span>
              {count > 0 && (
                <span className="text-[11px] font-medium" style={{ color: c.icon }}>
                  {count} producto{count === 1 ? '' : 's'}
                </span>
              )}
              <svg
                className="w-4 h-4 mt-2 opacity-60 transition-transform group-hover:translate-x-1"
                fill="none" stroke={c.icon} strokeWidth={2} viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
              </svg>
            </button>
          )
        })}
      </div>
    </div>
  )
}
