export default function ProductosVacio({ search, hasFilters, onClearFilters, onNuevo }) {
  if (search || hasFilters) {
    return (
      <div className="text-center py-14">
        <div className="space-y-2">
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>Sin resultados para los filtros actuales</p>
          <button type="button" onClick={onClearFilters} className="text-xs hover:underline" style={{ color: 'var(--hc-accent)' }}>Limpiar filtros →</button>
        </div>
      </div>
    )
  }
  return (
    <div className="text-center py-14">
      <div className="space-y-3">
        <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center" style={{ backgroundColor: 'rgba(23,71,168,0.1)', border: '1px solid rgba(23,71,168,0.15)' }}>
          <svg className="w-7 h-7" style={{ color: 'var(--hc-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
        </div>
        <p className="font-semibold" style={{ color: 'var(--hc-text)' }}>Sin productos publicados</p>
        <p className="text-sm max-w-xs mx-auto" style={{ color: 'var(--hc-muted)' }}>Tu catálogo está vacío. Agregá tu primer producto para comenzar a vender.</p>
        <button type="button"
          onClick={onNuevo}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold mt-1 transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}
        >
          + Crear primer producto
        </button>
      </div>
    </div>
  )
}
