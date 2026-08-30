import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { formatPrice } from '@/utils/format'
import { getOptimizedUrl } from '@/utils/imageUtils'
import type { Producto } from '@/types/producto'
import type { Id } from '@/types/api'
import { PackagePlaceholder } from './productIcons'

function RecommendationCard({
  rec, delay, onOpen,
}: {
  rec: Producto
  delay: number
  onOpen: (id: Id | undefined) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      onClick={() => onOpen(rec.id)}
      className="group shrink-0 cursor-pointer rounded-2xl overflow-hidden flex flex-col"
      style={{ width: 160, background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
    >
      <div className="w-full overflow-hidden" style={{ height: 160, background: 'var(--hc-surface-2)' }}>
        {rec.imagenUrl ? (
          <img
            src={getOptimizedUrl(rec.imagenUrl, { width: 160 })}
            alt={rec.nombre}
            className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <span className="flex items-center justify-center w-full h-full opacity-20">
            <PackagePlaceholder className="w-10 h-10" />
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1">
        <p className="text-[11px] font-medium line-clamp-2 leading-snug" style={{ color: 'var(--hc-text)' }}>
          {rec.nombre}
        </p>
        <p className="text-sm font-extrabold" style={{ color: 'var(--hc-accent)' }}>
          {formatPrice(rec.precio)}
        </p>
      </div>
    </motion.div>
  )
}

export default function RecommendationsRow({ recommendations }: { recommendations: Producto[] }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  if (recommendations.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="mt-7 sm:mt-14"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: 'var(--hc-muted)' }}>
        {t('product.youMayLike')}
      </p>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {recommendations.slice(0, 5).map((rec, i) => (
          <RecommendationCard
            key={rec.id}
            rec={rec}
            delay={i * 0.07}
            onOpen={(id) => navigate(`/productos/${id}`)}
          />
        ))}
      </div>
    </motion.div>
  )
}
