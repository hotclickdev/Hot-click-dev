import ProductCard from '@/components/comprador/ProductCard'
import { CLASE_GRILLA_TARJETAS } from './catalogoGrilla'
import VerMasTarjeta from './VerMasTarjeta'
import TextoFlecha from '@/components/ui/TextoFlecha'
import type { Producto } from '@/types/producto'
import type { Id } from '@/types/api'

// ── Fila de una categoría (3 productos + Ver más) ─────────────────────────────
export default function CategoryRow({
  catName, catId, products, onVerMas,
}: {
  catName: string
  catId: Id | string | undefined
  products: Producto[]
  onVerMas: (catId: unknown) => void
}) {
  const extra = products.length - 3
  const slice = products.slice(0, 3)
  const hasMore = products.length > 3

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-[17px] font-bold leading-[normal] tracking-normal text-hc-n-900 lg:text-[20px]">
            {catName}
          </h2>
          <span className="rounded-full bg-hc-n-100 px-2 py-[3px] text-[11px] font-semibold leading-[13px] text-hc-n-600">
            {products.length}
          </span>
        </div>
        <button type="button"
          onClick={() => onVerMas(catId)}
          className="flex items-center gap-1 text-[13px] font-semibold leading-[normal] text-hc-blue-600"
        >
          <TextoFlecha iconClassName="w-3.5 h-3.5">Ver más</TextoFlecha>
        </button>
      </div>

      <div className={CLASE_GRILLA_TARJETAS}>
        {slice.slice(0, 2).map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}

        {/* 3er producto: solo desde sm */}
        {slice[2] && (
          <div className="hidden sm:block">
            <ProductCard product={slice[2]} />
          </div>
        )}

        {hasMore && (
          <VerMasTarjeta
            cantidad={extra}
            unidad="productos más"
            categoria={catName}
            onClick={() => onVerMas(catId)}
          />
        )}
      </div>
    </div>
  )
}
