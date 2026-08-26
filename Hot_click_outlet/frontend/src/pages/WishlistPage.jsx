import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import useWishlistStore from '@/store/wishlistStore'
import useCartStore from '@/store/cartStore'
import { useToast } from '@/components/ui/Toast'
import { formatPrice } from '@/utils/format'
import TrustGlyph from '@/components/ui/TrustGlyph'

export default function WishlistPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { items, remove } = useWishlistStore()
  const addItem = useCartStore((s) => s.addItem)
  const toast = useToast()
  const [recentlyAdded, setRecentlyAdded] = useState(new Set())

  const handleAddToCart = (product) => {
    addItem(product)
    toast({ message: t('wishlist.addedToCart', { name: product.nombre }), type: 'success' })
    setRecentlyAdded((prev) => new Set([...prev, product.id]))
    setTimeout(() => {
      setRecentlyAdded((prev) => {
        const next = new Set(prev)
        next.delete(product.id)
        return next
      })
    }, 1400)
  }

  if (items.length === 0) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-5"
          >
            <div className="relative w-28 h-28 flex items-center justify-center">
              <div className="absolute inset-0 rounded-3xl" style={{ background: 'color-mix(in srgb, #ec4899 8%, transparent)', border: '1px solid color-mix(in srgb, #ec4899 18%, transparent)' }} />
              <div className="absolute inset-0 rounded-3xl blur-2xl opacity-20" style={{ background: '#ec4899' }} />
              <svg className="relative w-14 h-14 text-pink-400" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--hc-text)' }}>{t('wishlist.empty')}</h1>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
                {t('wishlist.emptySub')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-1">
              <button type="button"
                onClick={() => navigate('/productos')}
                className="hc-btn hc-btn-primary min-h-11 px-6"
              >
                {t('wishlist.explore')}
              </button>
            </div>
          </motion.div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--hc-text)' }}>{t('wishlist.title')}</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
              {t('wishlist.saved', { count: items.length })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <AnimatePresence>
            {items.map((product, i) => (
              <WishlistCard
                key={product.id}
                product={product}
                index={i}
                added={recentlyAdded.has(product.id)}
                onAdd={() => handleAddToCart(product)}
                onRemove={() => remove(product.id)}
                t={t}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </MainLayout>
  )
}

function WishlistCard({ product, index, added, onAdd, onRemove, t }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      className="group rounded-2xl overflow-hidden"
      style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
    >
      <div className="relative h-40 overflow-hidden" style={{ background: 'var(--hc-surface-2)' }}>
        <Link to={`/productos/${product.id}`} className="flex items-center justify-center w-full h-full">
          {product.imagenUrl ? (
            <img
              src={product.imagenUrl}
              alt={product.nombre}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <span className="opacity-30" style={{ color: 'var(--hc-muted)' }}>
              <TrustGlyph tipo="paquete" className="w-10 h-10" />
            </span>
          )}
        </Link>
        <button type="button"
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="absolute top-2 right-2 z-10 w-11 h-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center bg-black/45 hover:bg-red-500/30 transition-colors border border-white/10"
          aria-label={t('wishlist.remove')}
        >
          <svg className="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </button>
      </div>

      <Link to={`/productos/${product.id}`} className="p-3 block">
        <h3 className="font-medium text-xs leading-snug line-clamp-2 mb-1.5" style={{ color: 'var(--hc-text)' }}>
          {product.nombre}
        </h3>
        <span className="font-bold text-sm" style={{ color: 'var(--hc-text)', fontFamily: 'var(--font-display)' }}>
          {formatPrice(product.precio)}
        </span>
      </Link>

      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={onAdd}
          disabled={product.stock === 0}
          className={claseAgregarWishlist(product.stock === 0, added)}
        >
          {etiquetaAgregar(product.stock === 0, added, t)}
        </button>
      </div>
    </motion.div>
  )
}

function claseAgregarWishlist(sinStock, added) {
  if (sinStock) return 'hc-btn w-full min-h-11 text-xs'
  if (added) return 'hc-btn w-full min-h-11 text-xs bg-emerald-500 text-white border-emerald-500'
  return 'hc-btn hc-btn-primary w-full min-h-11 text-xs'
}

function etiquetaAgregar(sinStock, added, t) {
  if (sinStock) return t('wishlist.outOfStock')
  if (added) return t('wishlist.addedFeedback')
  return t('wishlist.addToCart')
}
