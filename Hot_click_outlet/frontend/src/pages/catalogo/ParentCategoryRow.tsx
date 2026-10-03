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
          <h2 className="font-display text-[17px] font-bold leading-[normal] tracking-normal text-hc-n-900 lg:text-[20px]">
            {catName}
          </h2>
          <span className="rounded-full bg-hc-n-100 px-2 py-[3px] text-[11px] font-semibold leading-[13px] text-hc-n-600">
            {totalCount}
          </span>
        </div>
        <button type="button"
          onClick={() => onVerMas(catId)}
          className="flex items-center gap-1 text-[13px] font-semibold leading-[normal] text-hc-blue-600"
        >
          <TextoFlecha iconClassName="w-3.5 h-3.5">Ver más</TextoFlecha>
        </button>
      </div>

      {/* Grid: 2 cols mobile / 4 cols desktop */}
      <div className={CLASE_GRILLA_TARJETAS}>
        {/* Primeros 2 hijos — siempre visibles */}
        {visible.slice(0, 2).map(item => (
          <div key={item.childId} className="flex flex-col gap-1">
            <span className="truncate px-0.5 text-[11px] font-semibold leading-[normal] text-hc-n-600">
              {item.childName}
            </span>
            <ProductCard product={item.product} />
          </div>
        ))}

        {/* 3er hijo — solo desktop */}
        {visible[2] && (
          <div className="hidden sm:flex flex-col gap-1">
            <span className="truncate px-0.5 text-[11px] font-semibold leading-[normal] text-hc-n-600">
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
          icono={<span className="text-[26px] font-bold leading-none text-hc-n-600">…</span>}
        />
      </div>
    </div>
  )
}
