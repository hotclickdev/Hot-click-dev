import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '@/utils/format'
import { getOptimizedUrl } from '@/utils/imageUtils'
import { PackagePlaceholder } from './productIcons'

// ── Sticky Cart Bar ───────────────────────────────────────────────────────────

export default function StickyCartBar({ product, quantity, onDecrease, onIncrease, onAdd, justAdded, atMax, inStock }) {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 42 }}
      className="fixed left-0 right-0 z-50 backdrop-blur-2xl hc-sticky-cta"
      style={{
        background: 'color-mix(in srgb, var(--hc-surface) 90%, transparent)',
        borderTop: '1px solid var(--hc-border)',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.25)',
      }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
        {/* Thumbnail + info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#1a1a1f] overflow-hidden shrink-0 border border-white/8">
            {product.imagenUrl ? (
              <img src={getOptimizedUrl(product.imagenUrl, { width: 44 })} alt={product.nombre} width={44} height={44} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center opacity-30">
                <PackagePlaceholder className="w-5 h-5" />
              </div>
            )}
          </div>
          <div className="min-w-0 hidden sm:block">
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--hc-text)' }}>
              {product.titulo || product.nombre}
            </p>
            <p className="text-sm font-bold text-[#4f7cff]">{formatPrice(product.precio)}</p>
          </div>
          <p className="text-sm font-bold text-[#4f7cff] sm:hidden whitespace-nowrap">{formatPrice(product.precio)}</p>
        </div>

        {/* Quantity selector */}
        <div className="flex items-center rounded-xl border overflow-hidden shrink-0" style={{ borderColor: 'var(--hc-border)' }}>
          <button type="button"
            onClick={onDecrease}
            disabled={quantity <= 1}
            aria-label={t('common.previous')}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-[#8e8e9a] hover:text-white disabled:opacity-25 transition-colors select-none text-lg"
          >
            −
          </button>
          <span className="w-7 sm:w-8 text-center text-sm font-bold" aria-live="polite" style={{ color: 'var(--hc-text)' }}>
            {quantity}
          </span>
          <button type="button"
            onClick={onIncrease}
            disabled={atMax}
            aria-label={t('common.next')}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-[#8e8e9a] hover:text-white disabled:opacity-25 transition-colors select-none text-lg"
          >
            +
          </button>
        </div>

        {/* CTA */}
        <motion.button
          onClick={onAdd}
          whileTap={inStock && !justAdded ? { scale: 0.95 } : {}}
          disabled={!inStock}
          className={`shrink-0 h-10 px-5 sm:px-7 rounded-xl font-bold text-sm transition-all duration-300 ${claseCtaSticky(justAdded, inStock)}`}
        >
          <AnimatePresence mode="wait" initial={false}>
            {justAdded ? (
              <motion.span
                key="done"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="hidden sm:inline">Añadido</span>
              </motion.span>
            ) : (
              <motion.span key="add" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Agregar
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.div>
  )
}

function claseCtaSticky(justAdded, inStock) {
  if (justAdded) return 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]'
  if (inStock) {
    return 'bg-[#4f7cff] hover:bg-[#3d6ee0] text-white shadow-[0_0_20px_rgba(23,71,168,0.35)] hover:shadow-[0_0_32px_rgba(23,71,168,0.55)]'
  }
  return 'bg-white/5 text-[#8e8e9a] cursor-not-allowed'
}
