import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import useWishlistStore from '@/store/wishlistStore'
import useCartStore from '@/store/cartStore'
import { useToast } from '@/components/ui/Toast'
import { formatPrice, conditionLabel } from '@/utils/format'
import OptimizedImage from '@/components/ui/OptimizedImage'

const CONDICION_STYLES = {
  NUEVO:     { background: 'var(--hc-success-bg)', color: 'var(--hc-success)', border: '1px solid color-mix(in srgb, var(--hc-success) 30%, transparent)' },
  COMO_NUEVO:{ background: 'var(--hc-info-bg)',    color: 'var(--hc-info)',    border: '1px solid color-mix(in srgb, var(--hc-info) 30%, transparent)' },
}
const CONDICION_DEFAULT = { background: 'var(--hc-warning-bg)', color: 'var(--hc-warning)', border: '1px solid color-mix(in srgb, var(--hc-warning) 30%, transparent)' }

function ProductCard({ product, priority = false, index = 0, hotTag = null }) {
  const navigate = useNavigate()
  const { toggle: toggleWishlist, isLiked } = useWishlistStore()
  const addItem = useCartStore((s) => s.addItem)
  const toast = useToast()
  const { t } = useTranslation()
  const [imgError, setImgError] = useState(false)
  const [added, setAdded] = useState(false)

  const liked = isLiked(product.id)
  const condicionStyle = CONDICION_STYLES[product.condicion] ?? CONDICION_DEFAULT
  let stockColor = 'var(--hc-success)'
  if (product.stock === 0) stockColor = 'var(--hc-danger)'
  else if (product.stock <= 3) stockColor = 'var(--hc-warning)'
  let stockText = t('products.inStock')
  if (product.stock === 0) stockText = t('products.outOfStock')
  else if (product.stock <= 3) stockText = t('products.lowStock', { count: product.stock })

  const handleAddToCart = (e) => {
    e.stopPropagation()
    if (product.stock === 0) return
    addItem(product)
    setAdded(true)
    toast({ message: `${product.nombre} agregado al carrito`, type: 'success' })
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <motion.div
      initial={{ opacity: priority ? 1 : 0, y: priority ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: priority ? 0 : Math.min(index * 0.05, 0.32) }}
      whileHover={{ y: -6, transition: { duration: 0.2, ease: 'easeOut' } }}
      className="group hc-card hc-card-glow rounded-2xl overflow-hidden cursor-pointer"
      onClick={() => navigate(`/productos/${product.id}`, { state: { product } })}
    >
      {/* ── Image — ratio 1:1 en catálogo (Brand Book §5.2) ── */}
      <div className="hc-product-img relative aspect-square flex items-center justify-center overflow-hidden">
        {product.imagenUrl && !imgError ? (
          <OptimizedImage
            src={product.imagenUrl}
            alt={product.nombre}
            width={400}
            height={400}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
            priority={priority}
            quality={80}
            onError={() => setImgError(true)}
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

        {/* Tag promocional roja + badge de condición (semánticos del manual) */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          {hotTag && (
            <span
              className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md"
              style={{ background: 'var(--hc-red-500)', color: '#FFFFFF', fontFamily: 'var(--font-display)' }}
            >
              {hotTag}
            </span>
          )}
          {product.condicion && (
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
              style={condicionStyle}
            >
              {conditionLabel(product.condicion)}
            </span>
          )}
        </div>

        {/* Wishlist heart */}
        <button type="button"
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
          {/* Precio en Sora 700 (Brand Book cap. 4.3) */}
          <span
            className="text-lg sm:text-xl leading-none"
            style={{ color: 'var(--hc-text)', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.02em' }}
          >
            {formatPrice(product.precio)}
          </span>
          <div className="flex items-center gap-1.5 shrink-0 pb-0.5">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: stockColor }}
            />
            <span
              className="text-[10px] font-semibold"
              style={{ color: stockColor }}
            >
              {stockText}
            </span>
          </div>
        </div>

        {/* Beneficio de envío (§5.3: la tarjeta siempre muestra el beneficio) */}
        <p className="text-[11px] leading-none -mt-0.5" style={{ color: 'var(--hc-muted)' }}>
          {t('products.shippingBenefit', 'Envío a todo Costa Rica · 1–5 días')}
        </p>

        {/* Botón agregar al carrito */}
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className="w-full flex items-center justify-center gap-2 h-9 rounded-xl text-sm font-semibold transition-all duration-200 mt-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: added
              ? 'color-mix(in srgb, #10b981 15%, transparent)'
              : 'color-mix(in srgb, var(--hc-accent) 10%, transparent)',
            color: added ? '#10b981' : 'var(--hc-accent)',
            border: `1.5px solid ${added
              ? 'color-mix(in srgb, #10b981 30%, transparent)'
              : 'color-mix(in srgb, var(--hc-accent) 25%, transparent)'}`,
          }}
        >
          {added ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Agregado
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Agregar al carrito
            </>
          )}
        </motion.button>

      </div>
    </motion.div>
  )
}

// No usar memo aquí: el wishlistStore es externo y el componente
// ya usa selectores de Zustand que generan su propio re-render.
export default ProductCard

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
