import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'

export default function QuickViewActions({
  product,
  inStock,
  quantity,
  setQuantity,
  atMax,
  liked,
  toggle,
  handleAdd,
  handleComprarAhora,
  justAdded,
  onClose,
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <>
      {inStock && (
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl border overflow-hidden" style={{ borderColor: 'var(--hc-border)' }}>
            <button type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-9 h-9 flex items-center justify-center transition-colors text-[#8e8e9a] hover:text-white select-none text-lg"
            >−</button>
            <span className="w-8 text-center text-sm font-bold" style={{ color: 'var(--hc-text)' }}>{quantity}</span>
            <button type="button"
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

      <div className="flex flex-col gap-2 mt-auto pt-1">
        <Button
          variant="primary"
          className="w-full h-11 rounded-xl text-sm font-semibold"
          disabled={!inStock}
          onClick={handleComprarAhora}
        >
          {t('product.buyNow')}
        </Button>
        <div className="flex gap-2">
          <motion.button
            type="button"
            onClick={handleAdd}
            disabled={!inStock}
            whileTap={inStock && !justAdded ? { scale: 0.97 } : {}}
            className={`flex-1 h-11 rounded-xl font-semibold text-sm overflow-hidden ${claseAgregarQuick(inStock, justAdded)}`}
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

        <button type="button"
          onClick={() => { onClose(); navigate(`/productos/${product.id}`) }}
          className="h-11 px-4 rounded-xl text-sm font-medium border transition-colors whitespace-nowrap hover:bg-white/5"
          style={{ color: 'var(--hc-muted)', borderColor: 'var(--hc-border)' }}
        >
          {t('quickView.viewDetail')}
        </button>
        </div>
      </div>
    </>
  )
}

function claseAgregarQuick(inStock, justAdded) {
  if (!inStock) return 'hc-btn'
  if (justAdded) return 'hc-btn bg-emerald-500 text-white border-emerald-500'
  return 'hc-btn hc-btn-ghost'
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
