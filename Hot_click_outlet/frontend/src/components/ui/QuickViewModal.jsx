import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'
import { formatPrice, conditionLabel, conditionVariant } from '@/utils/format'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { analytics } from '@/utils/analytics'

export default function QuickViewModal({ product, onClose }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [quantity, setQuantity] = useState(1)
  const [justAdded, setJustAdded] = useState(false)
  const addItem = useCartStore((s) => s.addItem)
  const { toggle, isLiked } = useWishlistStore()
  const toast = useToast()
  const addTimeout = useRef(null)
  const liked = isLiked(product.id)
  const inStock = product.stock > 0
  const atMax = quantity >= (product.stock ?? 99)

  useEffect(() => { analytics.quickViewOpen(product) }, [])

  useEffect(() => () => clearTimeout(addTimeout.current), [])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleAdd = () => {
    if (!inStock || justAdded) return
    for (let i = 0; i < quantity; i++) addItem(product)
    const qtyPrefix = quantity > 1 ? `${quantity}× ` : ''
    toast({ message: `${qtyPrefix}${product.nombre} ${t('quickView.addedToast')}`, type: 'success' })
    setJustAdded(true)
    addTimeout.current = setTimeout(() => setJustAdded(false), 1400)
  }

  let addBtnCls = 'bg-[#4f7cff] hover:bg-[#3d6ee0] text-white'
  if (!inStock) addBtnCls = 'bg-white/5 text-[#8e8e9a] cursor-not-allowed'
  else if (justAdded) addBtnCls = 'bg-emerald-500 text-white'

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        role="presentation"
        onClick={onClose}
      />

      {/* Container — bottom sheet on mobile, centered on desktop */}
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          className="pointer-events-auto w-full md:max-w-[680px] md:mx-4 rounded-t-3xl md:rounded-2xl overflow-hidden"
          style={{
            background: 'var(--hc-surface)',
            border: '1px solid var(--hc-border)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          }}
        >
          {/* Mobile drag handle */}
          <div className="flex justify-center pt-3 pb-1 md:hidden">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          <div className="flex flex-col md:flex-row max-h-[85vh] md:max-h-[520px] overflow-y-auto md:overflow-hidden">
            {/* Image */}
            <button
              type="button"
              className="w-full md:w-56 h-52 md:h-auto bg-[#111114] shrink-0 flex items-center justify-center overflow-hidden"
              onClick={() => { onClose(); navigate(`/productos/${product.id}`) }}
            >
              {product.imagenUrl ? (
                <img src={product.imagenUrl} alt={product.nombre} className="w-full h-full object-cover" />
              ) : (
                <span className="text-6xl opacity-20">📦</span>
              )}
            </button>

            {/* Info */}
            <div className="flex-1 p-5 md:p-6 flex flex-col gap-3.5 overflow-y-auto">
              {/* Header: title + close */}
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-1.5">
                  {product.condicion && (
                    <Badge variant={conditionVariant(product.condicion)}>
                      {conditionLabel(product.condicion)}
                    </Badge>
                  )}
                  <h3 className="font-bold text-base leading-snug" style={{ color: 'var(--hc-text)' }}>
                    {product.titulo || product.nombre}
                  </h3>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-xl transition-colors shrink-0 hover:bg-white/8"
                  style={{ color: 'var(--hc-muted)' }}
                  aria-label={t('quickView.close')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Price + stock */}
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-[#e8e8ed]">{formatPrice(product.precio)}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${inStock ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  <span className={`text-xs font-medium ${inStock ? 'text-emerald-400' : 'text-red-400'}`}>
                    {inStock ? t('quickView.available', { count: product.stock }) : t('quickView.outOfStock')}
                  </span>
                </div>
              </div>

              {/* Description */}
              {product.descripcion && (
                <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'var(--hc-muted)' }}>
                  {product.descripcion}
                </p>
              )}

              {/* Qty + wishlist row */}
              {inStock && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-xl border overflow-hidden" style={{ borderColor: 'var(--hc-border)' }}>
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-9 h-9 flex items-center justify-center transition-colors text-[#8e8e9a] hover:text-white select-none text-lg"
                    >−</button>
                    <span className="w-8 text-center text-sm font-bold" style={{ color: 'var(--hc-text)' }}>{quantity}</span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(q + 1, product.stock ?? 99))}
                      disabled={atMax}
                      className="w-9 h-9 flex items-center justify-center transition-colors text-[#8e8e9a] hover:text-white disabled:opacity-25 select-none text-lg"
                    >+</button>
                  </div>

                  <motion.button
                    onClick={() => toggle(product)}
                    whileTap={{ scale: 0.78 }}
                    whileHover={{ scale: 1.08 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                    className="w-9 h-9 flex items-center justify-center rounded-xl border transition-all duration-200"
                    style={{
                      borderColor: liked ? 'rgba(239,68,68,0.4)' : 'var(--hc-border)',
                      background: liked ? 'rgba(239,68,68,0.1)' : 'transparent',
                    }}
                    aria-label={liked ? t('quickView.removeWishlist') : t('quickView.addWishlist')}
                  >
                    <HeartIcon filled={liked} />
                  </motion.button>

                  <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                    {liked ? t('quickView.inWishlist') : t('quickView.save')}
                  </span>
                </div>
              )}

              {/* CTA buttons */}
              <div className="flex gap-2 mt-auto pt-1">
                <motion.button
                  onClick={handleAdd}
                  disabled={!inStock}
                  whileTap={inStock && !justAdded ? { scale: 0.97 } : {}}
                  className={`flex-1 h-11 rounded-xl font-semibold text-sm transition-all duration-300 overflow-hidden ${addBtnCls}`}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {justAdded ? (
                      <motion.span
                        key="done"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {t('quickView.added')}
                      </motion.span>
                    ) : (
                      <motion.span key="add" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {inStock ? t('quickView.addToCart') : t('quickView.outOfStock')}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>

                <button
                  onClick={() => { onClose(); navigate(`/productos/${product.id}`) }}
                  className="h-11 px-4 rounded-xl text-sm font-medium border transition-colors whitespace-nowrap hover:bg-white/5"
                  style={{ color: 'var(--hc-muted)', borderColor: 'var(--hc-border)' }}
                >
                  {t('quickView.viewDetail')}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  )
}

function HeartIcon({ filled }) {
  return filled ? (
    <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" style={{ color: 'var(--hc-muted)' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  )
}
