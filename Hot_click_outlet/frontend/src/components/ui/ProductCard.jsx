import { memo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'
import { useToast } from '@/components/ui/Toast'
import { formatPrice, conditionLabel } from '@/utils/format'

/**
 * @param {object}   product      - normalized product object
 * @param {boolean}  priority     - true for the first ~4 cards visible above the fold
 * @param {number}   index        - position in the list (drives stagger animation delay)
 * @param {function} onQuickView  - opens the quick-view modal in the parent
 */
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.3) }}
      whileHover={{ y: -6 }}
      className="group hc-card hc-card-glow rounded-2xl overflow-hidden cursor-pointer transition-shadow duration-300 hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
      onClick={() => navigate(`/productos/${product.id}`, { state: { product } })}
    >
      {/* ── Image ── */}
      <div className="relative h-36 sm:h-48 bg-[#1a1a1f] flex items-center justify-center overflow-hidden">
        {product.imagenUrl ? (
          <img
            src={product.imagenUrl}
            alt={product.nombre}
            width={300}
            height={300}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
          />
        ) : (
          <svg className="w-12 h-12 text-[#8e8e9a]/20 group-hover:opacity-40 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
          </svg>
        )}

        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
            <span className="text-xs font-medium text-white/70 bg-black/50 px-3 py-1 rounded-full">
              {t('products.outOfStock')}
            </span>
          </div>
        )}

        {product.condicion && product.condicion !== 'NUEVO' && (
          <div className="absolute top-2 left-2">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400">
              {conditionLabel(product.condicion)}
            </span>
          </div>
        )}

        {/* Wishlist heart */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleWishlist(product) }}
          className="absolute top-2 right-2 z-10 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200"
          style={{
            background: isLiked(product.id) ? 'rgba(239,68,68,0.18)' : 'rgba(0,0,0,0.45)',
            border: isLiked(product.id) ? '1px solid rgba(239,68,68,0.38)' : '1px solid rgba(255,255,255,0.12)',
          }}
          aria-label={isLiked(product.id) ? 'Quitar de favoritos' : 'Guardar en wishlist'}
        >
          <HeartCardIcon filled={isLiked(product.id)} />
        </button>

        {/* Quick-add overlay — desktop hover */}
        {product.stock > 0 && (
          <>
            <div className="hc-card-overlay" />
            <div className="hc-quick-add absolute bottom-0 left-0 right-0 p-2">
              <div className="flex gap-1.5">
                <button
                  onClick={(e) => { e.stopPropagation(); onQuickView?.(product) }}
                  className="shrink-0 h-8 px-2.5 rounded-xl text-xs font-medium bg-white/15 text-[#e8e8ed] border border-white/20 hover:bg-white/25 flex items-center gap-1 transition-colors"
                >
                  <EyeIcon />
                  <span className="hidden sm:inline">Vista rápida</span>
                </button>
                <button
                  onClick={handleAdd}
                  className={`flex-1 h-8 rounded-xl text-xs font-bold transition-colors duration-200 ${
                    justAdded ? 'bg-emerald-500 text-white' : 'bg-[#4f7cff] text-white'
                  }`}
                >
                  {justAdded ? '✓ Añadido' : `+ ${t('products.addToCart')}`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Content ── */}
      <div className="p-3 sm:p-4">
        {product.marcaNombre && (
          <span
            className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5 truncate max-w-full"
            style={{ background: 'rgba(140,92,246,0.12)', color: 'var(--hc-accent)', border: '1px solid rgba(140,92,246,0.25)' }}
          >
            {product.marcaNombre}
          </span>
        )}

        <h3
          className="font-medium text-xs sm:text-sm leading-snug line-clamp-2 mb-2 sm:mb-2.5 group-hover:text-white transition-colors"
          style={{ color: 'var(--hc-text)' }}
        >
          {product.nombre}
        </h3>

        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <span className="font-bold text-sm sm:text-base" style={{ color: 'var(--hc-text)' }}>
            {formatPrice(product.precio)}
          </span>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              product.stock === 0 ? 'bg-red-400' : product.stock <= 3 ? 'bg-amber-400' : 'bg-emerald-400'
            }`} />
            <span className={`text-[10px] sm:text-xs font-medium ${
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
            className={`sm:hidden w-full h-8 rounded-xl text-xs font-medium transition-all duration-200 ${
              justAdded
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'hc-btn hc-btn-ghost'
            }`}
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
    <svg className="w-3.5 h-3.5 text-white/70" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
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
