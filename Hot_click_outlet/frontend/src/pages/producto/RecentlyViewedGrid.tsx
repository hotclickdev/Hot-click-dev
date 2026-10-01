import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '@/utils/format'
import { getOptimizedUrl } from '@/utils/imageUtils'
import type { ItemVisto } from '@/types/carrito'
import { PackagePlaceholder } from './productIcons'

type RecentlyViewedGridProps = {
  items: ItemVisto[]
  currentProductId: number | undefined
}

/** "Visto recientemente": no está en Figma; se conserva con los tokens del diseño de compra. */
export default function RecentlyViewedGrid({ items, currentProductId }: RecentlyViewedGridProps) {
  const { t } = useTranslation()
  const visibles = items.filter((p) => p.id !== currentProductId).slice(0, 4)
  if (visibles.length === 0) return null

  return (
    <section aria-labelledby="visto-recientemente" className="flex flex-col gap-3 pb-6 pt-3 leading-[normal]">
      <h2 id="visto-recientemente" className="font-display text-[16px] font-bold leading-5 tracking-normal text-hc-n-900 [text-wrap:wrap]">
        {t('home.recentlyViewed')}
      </h2>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {visibles.map((p) => (
          <Link
            key={p.id}
            to={`/productos/${p.id}`}
            className="flex items-center gap-[10px] rounded-xl border border-hc-n-200 bg-hc-n-0 p-2"
          >
            <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-hc-n-100">
              {p.imagenUrl
                ? <img src={getOptimizedUrl(p.imagenUrl, { width: 80 })} alt="" width={40} height={40} className="size-full object-cover" loading="lazy" />
                : <PackagePlaceholder className="size-4 opacity-40" />}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12px] text-hc-n-600">{p.nombre}</span>
              <span className="block font-display text-[13px] font-bold text-hc-n-900">{formatPrice(p.precio)}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
