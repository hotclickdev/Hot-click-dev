import ProductCard from './catalogoProductCard'
import TextoFlecha from '@/components/ui/TextoFlecha'
import type { Producto } from '@/types/producto'
import type { Id } from '@/types/api'
import type { CatalogChildItem } from './catalogoTipos'

// ── Fila de categoría PADRE: 1 producto por cada categoría hija ──────────────
export default function ParentCategoryRow({
  catName, catId, childItems, totalCount, onVerMas, onQuickView,
}: {
  catName: string
  catId: Id | undefined
  childItems: CatalogChildItem[]
  totalCount: number
  onVerMas: (catId: unknown) => void
  onQuickView: (product: Producto) => void
}) {
  const visible = childItems.slice(0, 3)
  const extraChildren = childItems.length - 3

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black uppercase tracking-wide" style={{ color: 'var(--hc-text)' }}>
            {catName}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)', color: 'var(--hc-accent)' }}>
            {totalCount}
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

      {/* Grid: 2 cols mobile / 4 cols desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Primeros 2 hijos — siempre visibles */}
        {visible.slice(0, 2).map(item => (
          <div key={item.childId} className="flex flex-col gap-1">
            <span className="text-[9px] font-black uppercase tracking-widest px-0.5 truncate"
              style={{ color: 'var(--hc-accent)', opacity: 0.75 }}>
              {item.childName}
            </span>
            <ProductCard product={item.product} onQuickView={onQuickView} />
          </div>
        ))}

        {/* 3er hijo — solo desktop */}
        {visible[2] && (
          <div className="hidden sm:flex flex-col gap-1">
            <span className="text-[9px] font-black uppercase tracking-widest px-0.5 truncate"
              style={{ color: 'var(--hc-accent)', opacity: 0.75 }}>
              {visible[2].childName}
            </span>
            <ProductCard product={visible[2].product} onQuickView={onQuickView} />
          </div>
        )}

        {/* Tarjeta 4: "+N categorías más" o "Ver categoría completa" */}
        <button type="button"
          onClick={() => onVerMas(catId)}
          className="hidden sm:flex flex-col rounded-2xl overflow-hidden transition-all hover:opacity-80 hover:scale-[1.01] text-left"
          style={{
            border: '1.5px dashed color-mix(in srgb, var(--hc-accent) 30%, transparent)',
            background: 'color-mix(in srgb, var(--hc-accent) 5%, var(--hc-surface))',
          }}
        >
          <div className="aspect-square flex flex-col items-center justify-center gap-1.5"
            style={{ background: 'color-mix(in srgb, var(--hc-accent) 8%, transparent)' }}>
            {extraChildren > 0 ? (
              <>
                <span className="text-3xl font-black leading-none" style={{ color: 'var(--hc-accent)' }}>
                  +{extraChildren}
                </span>
                <span className="text-[11px] font-semibold" style={{ color: 'var(--hc-accent)', opacity: 0.8 }}>
                  categorías más
                </span>
              </>
            ) : (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.4} viewBox="0 0 24 24"
                style={{ color: 'var(--hc-accent)', opacity: 0.7 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"/>
              </svg>
            )}
          </div>
          <div className="p-3 flex-1 flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1"
                style={{ color: 'color-mix(in srgb, var(--hc-accent) 70%, transparent)' }}>
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
      </div>
    </div>
  )
}
