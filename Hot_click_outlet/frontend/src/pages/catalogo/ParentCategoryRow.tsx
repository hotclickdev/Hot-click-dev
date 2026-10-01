import ProductCard from '@/components/comprador/ProductCard'
import { CLASE_GRILLA_TARJETAS } from './catalogoGrilla'
import VerMasTarjeta from './VerMasTarjeta'
import TextoFlecha from '@/components/ui/TextoFlecha'
import type { Id } from '@/types/api'
import type { CatalogChildItem } from './catalogoTipos'

// ── Fila de categoría PADRE: 1 producto por cada categoría hija ──────────────
export default function ParentCategoryRow({
  catName, catId, childItems, totalCount, onVerMas,
}: {
  catName: string
  catId: Id | undefined
  childItems: CatalogChildItem[]
  totalCount: number
  onVerMas: (catId: unknown) => void
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
      <div className={CLASE_GRILLA_TARJETAS}>
        {/* Primeros 2 hijos — siempre visibles */}
        {visible.slice(0, 2).map(item => (
          <div key={item.childId} className="flex flex-col gap-1">
            <span className="text-[9px] font-black uppercase tracking-widest px-0.5 truncate"
              style={{ color: 'var(--hc-accent)', opacity: 0.75 }}>
              {item.childName}
            </span>
            <ProductCard product={item.product} />
          </div>
        ))}

        {/* 3er hijo — solo desktop */}
        {visible[2] && (
          <div className="hidden sm:flex flex-col gap-1">
            <span className="text-[9px] font-black uppercase tracking-widest px-0.5 truncate"
              style={{ color: 'var(--hc-accent)', opacity: 0.75 }}>
              {visible[2].childName}
            </span>
            <ProductCard product={visible[2].product} />
          </div>
        )}

        {/* Tarjeta 4: "+N categorías más" o "Ver categoría completa" */}
        <VerMasTarjeta
          cantidad={extraChildren}
          unidad="categorías más"
          categoria={catName}
          onClick={() => onVerMas(catId)}
          icono={<span className="text-[26px] font-bold leading-none text-hc-n-500">…</span>}
        />
      </div>
    </div>
  )
}
