import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { formatPrice } from '@/utils/format'
import { getOptimizedUrl } from '@/utils/imageUtils'
import type { ItemVisto } from '@/types/carrito'
import { PackagePlaceholder } from './productIcons'

type RecentlyViewedGridProps = {
  items: ItemVisto[]
  currentProductId: number | undefined
}

export default function RecentlyViewedGrid({ items, currentProductId }: RecentlyViewedGridProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const visibles = items.filter((p) => p.id !== currentProductId).slice(0, 4)
  if (visibles.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35 }}
      className="mt-5 sm:mt-10 pt-4 sm:pt-6"
      style={{ borderTop: '1px solid var(--hc-border)' }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-3" style={{ color: 'var(--hc-muted)' }}>
        {t('home.recentlyViewed')}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {visibles.map((p) => (
          <motion.button
            key={p.id}
            type="button"
            whileHover={{ scale: 1.02 }}
            onClick={() => navigate(`/productos/${p.id}`)}
            className="flex items-center gap-2.5 p-2 rounded-xl text-left transition-all"
            style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
          >
            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0" style={{ background: 'var(--hc-surface-2)' }}>
              {p.imagenUrl
                ? <img src={getOptimizedUrl(p.imagenUrl, { width: 40 })} alt="" width={40} height={40} className="w-full h-full object-cover" loading="lazy" />
                : (
                  <span className="flex items-center justify-center w-full h-full opacity-40">
                    <PackagePlaceholder className="w-4 h-4" />
                  </span>
                )}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] truncate leading-tight" style={{ color: 'var(--hc-text-2)' }}>{p.nombre}</p>
              <p className="text-xs font-extrabold mt-0.5" style={{ color: 'var(--hc-accent)' }}>{formatPrice(p.precio)}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}
