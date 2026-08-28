import { Link } from 'react-router-dom'

function ShoppingBagIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
    </svg>
  )
}

export default function CatalogHero({
  activeCatName, filteredCount, onClearCategory,
}: {
  activeCatName?: string | null
  filteredCount: number
  onClearCategory: () => void
}) {
  return (
    <div className="relative overflow-hidden py-10 px-4"
      style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--hc-accent) 10%, var(--hc-bg)) 0%, color-mix(in srgb, var(--hc-accent) 3%, var(--hc-bg)) 60%, var(--hc-bg) 100%)' }}>
      <div className="max-w-7xl mx-auto">
        {activeCatName && (
          <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs mb-4">
            <Link to="/" className="hover:underline" style={{ color: 'var(--hc-muted)' }}>Inicio</Link>
            <span aria-hidden="true" style={{ color: 'var(--hc-border-strong)' }}>/</span>
            <button type="button" onClick={onClearCategory} className="hover:underline" style={{ color: 'var(--hc-muted)' }}>Productos</button>
            <span aria-hidden="true" style={{ color: 'var(--hc-border-strong)' }}>/</span>
            <span className="font-semibold" style={{ color: 'var(--hc-text-2)' }}>{activeCatName}</span>
          </nav>
        )}
        <div className="flex items-center gap-4 mb-2">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'color-mix(in srgb, var(--hc-accent) 15%, var(--hc-surface))', border: '1px solid color-mix(in srgb, var(--hc-accent) 28%, transparent)', color: 'var(--hc-accent)' }}>
            <ShoppingBagIcon />
          </div>
          <div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight" style={{ color: 'var(--hc-text)' }}>
              {activeCatName ?? 'Catálogo completo'}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
              Encontrá todo lo que buscás — precios directos sin intermediarios
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--hc-accent)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--hc-muted)' }}>
            {filteredCount} producto{filteredCount === 1 ? '' : 's'} disponible{filteredCount === 1 ? '' : 's'}
          </span>
        </div>
      </div>
      <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--hc-accent) 15%, transparent), transparent 70%)' }} />
    </div>
  )
}
