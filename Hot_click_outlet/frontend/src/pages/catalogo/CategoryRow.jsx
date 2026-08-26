import ProductCard from '@/components/ui/ProductCard'
import TextoFlecha from '@/components/ui/TextoFlecha'

// ── Fila de una categoría (3 productos + Ver más) ─────────────────────────────
export default function CategoryRow({ catName, catId, products, onVerMas, onQuickView }) {
  const extra = products.length - 3
  const slice = products.slice(0, 3)
  const hasMore = products.length > 3

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black uppercase tracking-wide" style={{ color: 'var(--hc-text)' }}>
            {catName}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)', color: 'var(--hc-accent)' }}>
            {products.length}
          </span>
        </div>
        <button type="button"
          onClick={() => onVerMas(catId)}
          className="flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-70"
          style={{ color: 'var(--hc-accent)' }}
        >
          <TextoFlecha iconClassName="w-3.5 h-3.5">Ver más</TextoFlecha>
        </button>
      </div>

      {/* Grid: 2 cols mobile, 4 cols sm+ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Primeros 2 productos — siempre visibles */}
        {slice.slice(0, 2).map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} onQuickView={onQuickView} />
        ))}

        {/* 3er producto — solo desktop */}
        {slice[2] && (
          <div className="hidden sm:block">
            <ProductCard product={slice[2]} index={2} onQuickView={onQuickView} />
          </div>
        )}

        {/* Tarjeta "ver todos" — solo desktop, misma estructura que ProductCard */}
        {hasMore && (
          <button type="button"
            onClick={() => onVerMas(catId)}
            className="hidden sm:flex flex-col rounded-2xl overflow-hidden transition-all hover:opacity-80 hover:scale-[1.01] text-left"
            style={{
              border: '1.5px dashed color-mix(in srgb, var(--hc-accent) 30%, transparent)',
              background: 'color-mix(in srgb, var(--hc-accent) 5%, var(--hc-surface))',
            }}
          >
            {/* Zona imagen — mismo aspect-square que ProductCard */}
            <div className="aspect-square flex flex-col items-center justify-center gap-1"
              style={{ background: 'color-mix(in srgb, var(--hc-accent) 8%, transparent)' }}>
              <span className="text-3xl font-black leading-none" style={{ color: 'var(--hc-accent)' }}>
                +{extra}
              </span>
              <span className="text-[11px] font-semibold" style={{ color: 'var(--hc-accent)', opacity: 0.8 }}>
                productos más
              </span>
            </div>
            {/* Zona texto — igual que ProductCard */}
            <div className="p-3 flex-1 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'color-mix(in srgb, var(--hc-accent) 70%, transparent)' }}>
                  {catName}
                </p>
                <p className="text-sm font-bold line-clamp-2 leading-snug" style={{ color: 'var(--hc-text)' }}>
                  Ver todos los productos
                </p>
              </div>
              <div className="mt-2 text-xs font-semibold" style={{ color: 'var(--hc-accent)' }}>
                <TextoFlecha iconClassName="w-3.5 h-3.5">Ver categoría completa</TextoFlecha>
              </div>
            </div>
          </button>
        )}
      </div>
    </div>
  )
}
