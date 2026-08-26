import ProductCard from '@/components/ui/ProductCard'
import TextoFlecha from '@/components/ui/TextoFlecha'

// ── Fila de Emprendimientos intercalada ───────────────────────────────────────
export default function EmprendimientosRow({ products, onVerEmprendimientos }) {
  const slice = products.slice(0, 3)
  if (slice.length === 0) return null
  return (
    <div className="mb-8 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.07) 0%, rgba(16,185,129,0.02) 100%)', border: '1.5px solid rgba(16,185,129,0.18)' }}>
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
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
          <TextoFlecha iconClassName="w-3.5 h-3.5">Ver todos</TextoFlecha>
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-4 pb-4">
        {slice.map((p, i) => (
          <div key={p.id} className="relative">
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black"
              style={{ background: 'rgba(16,185,129,0.22)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
              Local
            </div>
            <ProductCard product={p} index={i} />
          </div>
        ))}
      </div>
    </div>
  )
}
