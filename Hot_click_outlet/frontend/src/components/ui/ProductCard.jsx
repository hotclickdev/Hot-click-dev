import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import useWishlistStore from '@/store/wishlistStore'
import { formatPrice, conditionLabel, conditionVariant } from '@/utils/format'

function ProductCard({ product, priority = false, index = 0 }) {
  const navigate = useNavigate()
  const { toggle: toggleWishlist, isLiked } = useWishlistStore()
  const { t } = useTranslation()

  const liked = isLiked(product.id)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.32) }}
      whileHover={{ y: -6, transition: { duration: 0.2, ease: 'easeOut' } }}
      className="group hc-card hc-card-glow rounded-2xl overflow-hidden cursor-pointer"
      onClick={() => navigate(`/productos/${product.id}`, { state: { product } })}
    >
      {/* ── Image ── */}
      <div className="hc-product-img relative h-36 sm:h-48 flex items-center justify-center overflow-hidden">
        {product.imagenUrl ? (
          <img
            src={product.imagenUrl}
            alt={product.nombre}
            width={400}
            height={400}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
          />
        ) : (
          <div className="flex flex-col items-center gap-3 opacity-20">
            <svg className="w-10 h-10" style={{ color: 'var(--hc-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span className="text-[11px] font-medium tracking-wide uppercase" style={{ color: 'var(--hc-muted)' }}>
              Sin imagen
            </span>
          </div>
        )}

        {/* Out of stock */}
        {product.stock === 0 && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(6,4,20,0.65)', backdropFilter: 'blur(2px)' }}
          >
            <span
              className="text-[11px] font-semibold text-white/90 px-3.5 py-1.5 rounded-full tracking-wide"
              style={{ background: 'rgba(12,8,32,0.72)', border: '1px solid rgba(255,255,255,0.14)' }}
            >
              {t('products.outOfStock')}
            </span>
          </div>
        )}

        {/* Condition badge */}
        {product.condicion && (
          <div className="absolute top-2.5 left-2.5">
            {product.condicion === 'NUEVO' ? (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                {conditionLabel(product.condicion)}
              </span>
            ) : product.condicion === 'COMO_NUEVO' ? (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#4f7cff]/15 border border-[#4f7cff]/30 text-[#4f7cff]">
                {conditionLabel(product.condicion)}
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400">
                {conditionLabel(product.condicion)}
              </span>
            )}
          </div>
        )}

        {/* Wishlist heart */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleWishlist(product) }}
          className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
          style={{
            background: liked ? 'rgba(239,68,68,0.22)' : 'rgba(0,0,0,0.42)',
            border: liked ? '1px solid rgba(239,68,68,0.48)' : '1px solid rgba(255,255,255,0.18)',
            backdropFilter: 'blur(10px)',
          }}
          aria-label={liked ? 'Quitar de favoritos' : 'Guardar en wishlist'}
        >
          <HeartCardIcon filled={liked} />
        </button>

      </div>

      {/* ── Content ── */}
      <div className="p-4 sm:p-5 flex flex-col gap-2.5">
        {product.marcaNombre && (
          <span
            className="inline-block text-[10px] font-bold uppercase tracking-widest rounded-full w-fit"
            style={{
              padding: '3px 10px',
              background: 'color-mix(in srgb, var(--hc-accent) 11%, transparent)',
              color: 'var(--hc-accent)',
              border: '1px solid color-mix(in srgb, var(--hc-accent) 24%, transparent)',
            }}
          >
            {product.marcaNombre}
          </span>
        )}

        <h3 className="hc-product-name font-semibold text-sm sm:text-[15px] leading-snug line-clamp-2">
          {product.nombre}
        </h3>

        <div className="flex items-end justify-between gap-2">
          <span
            className="text-lg sm:text-xl font-black tracking-tight leading-none"
            style={{ color: 'var(--hc-text)' }}
          >
            {formatPrice(product.precio)}
          </span>
          <div className="flex items-center gap-1.5 shrink-0 pb-0.5">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              product.stock === 0 ? 'bg-red-400' : product.stock <= 3 ? 'bg-amber-400' : 'bg-emerald-400'
            }`} />
            <span className={`text-[10px] font-semibold ${
              product.stock === 0 ? 'text-red-400' : product.stock <= 3 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {product.stock === 0
                ? t('products.outOfStock')
                : product.stock <= 3
                ? t('products.lowStock', { count: product.stock })
                : t('products.inStock')}
            </span>
          </div>
        </div>

      </div>
    </motion.div>
  )
}

export default memo(ProductCard, (prev, next) =>
  prev.product.id    === next.product.id    &&
  prev.product.stock === next.product.stock &&
  prev.priority      === next.priority      &&
  prev.index         === next.index
)

function HeartCardIcon({ filled }) {
  return filled ? (
    <svg className="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  ) : (
    <svg className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.75)' }} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  )
}
