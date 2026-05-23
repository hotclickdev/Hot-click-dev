import { memo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'
import { useToast } from '@/components/ui/Toast'
import { formatPrice, conditionLabel } from '@/utils/format'

function ProductCard({ product, priority = false, index = 0, onQuickView }) {
  const navigate = useNavigate()
  const addItem = useCartStore((s) => s.addItem)
  const { toggle: toggleWishlist, isLiked } = useWishlistStore()
  const toast = useToast()
  const { t } = useTranslation()
  const [justAdded, setJustAdded] = useState(false)

  const handleAdd = (e) => {
    e.stopPropagation()
    addItem(product)
    toast({ message: t('product.added', { name: product.nombre }), type: 'success' })
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1400)
  }

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
      <div className="hc-product-img relative h-44 sm:h-56 flex items-center justify-center overflow-hidden">
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
        {product.condicion && product.condicion !== 'NUEVO' && (
          <div className="absolute top-2.5 left-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/35 text-amber-400">
              {conditionLabel(product.condicion)}
            </span>
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

        {/* Quick-add overlay — desktop hover */}
        {product.stock > 0 && (
          <>
            <div className="hc-card-overlay" />
            <div className="hc-quick-add absolute bottom-0 left-0 right-0 p-3">
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onQuickView?.(product) }}
                  className="shrink-0 h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.92)',
                    border: '1px solid rgba(255,255,255,0.20)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <EyeIcon />
                  <span className="hidden sm:inline">Vista rápida</span>
                </button>
                <button
                  onClick={handleAdd}
                  className={`flex-1 h-9 rounded-xl text-xs font-bold transition-all duration-200 ${justAdded ? 'bg-emerald-500 text-white' : ''}`}
                  style={justAdded ? {} : {
                    background: 'var(--hc-accent)',
                    color: 'white',
                    boxShadow: '0 2px 14px color-mix(in srgb, var(--hc-accent) 45%, transparent)',
                  }}
                >
                  {justAdded ? '✓ Añadido' : `+ ${t('products.addToCart')}`}
                </button>
              </div>
            </div>
          </>
        )}
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

        {/* Mobile add button — always visible on small screens */}
        {product.stock > 0 && (
          <button
            onClick={handleAdd}
            className={`sm:hidden w-full h-9 rounded-xl text-xs font-semibold transition-all duration-200 ${
              justAdded ? '' : 'hc-btn hc-btn-ghost'
            }`}
            style={justAdded ? {
              background: 'color-mix(in srgb, var(--hc-success) 12%, transparent)',
              color: 'var(--hc-success)',
              border: '1px solid color-mix(in srgb, var(--hc-success) 28%, transparent)',
            } : {}}
          >
            {justAdded ? '✓ Añadido' : t('products.addToCart')}
          </button>
        )}
      </div>
    </motion.div>
  )
}

export default memo(ProductCard, (prev, next) =>
  prev.product.id    === next.product.id    &&
  prev.product.stock === next.product.stock &&
  prev.priority      === next.priority      &&
  prev.index         === next.index         &&
  prev.onQuickView   === next.onQuickView
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

function EyeIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
