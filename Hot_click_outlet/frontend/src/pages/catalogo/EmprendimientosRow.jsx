import ProductCard from '@/components/ui/ProductCard'

// ── Fila de Emprendimientos intercalada ───────────────────────────────────────
export default function EmprendimientosRow({ products, onVerEmprendimientos }) {
  const slice = products.slice(0, 3)
  if (slice.length === 0) return null
  return (
    <div className="mb-8 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.07) 0%, rgba(16,185,129,0.02) 100%)', border: '1.5px solid rgba(16,185,129,0.18)' }}>
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🤝</span>
          <span className="text-sm font-black uppercase tracking-wide" style={{ color: '#10b981' }}>Emprendimientos CR</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
            {products.length}
          </span>
        </div>
        <button type="button"
          onClick={onVerEmprendimientos}
          className="flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-70"
          style={{ color: '#10b981' }}
        >
          Ver todos
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-4 pb-4">
        {slice.map((p, i) => (
          <div key={p.id} className="relative">
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black"
              style={{ background: 'rgba(16,185,129,0.22)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
              🤝 Local
            </div>
            <ProductCard product={p} index={i} />
          </div>
        ))}
      </div>
    </div>
  )
}
