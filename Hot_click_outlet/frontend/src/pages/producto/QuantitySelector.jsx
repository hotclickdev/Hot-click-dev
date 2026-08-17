import { motion, AnimatePresence } from 'framer-motion'

/**
 * Control de cantidad con tope de stock.
 */
export default function QuantitySelector({ quantity, stock, atMax, onDecrease, onIncrease, t }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-[#8e8e9a] shrink-0">{t('product.quantity')}</span>

      <div className="flex items-center rounded-2xl border border-white/12 bg-white/4 overflow-hidden">
        <motion.button
          onClick={onDecrease}
          disabled={quantity <= 1}
          whileTap={{ scale: 0.85 }}
          className="w-12 h-12 flex items-center justify-center text-[#8e8e9a] hover:text-white hover:bg-white/8 disabled:opacity-25 disabled:cursor-not-allowed transition-colors select-none"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M5 12h14" />
          </svg>
        </motion.button>

        <div className="w-12 flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.span
              key={quantity}
              initial={{ opacity: 0, y: -12, scale: 0.7 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.7 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="text-base font-bold text-[#e8e8ed] select-none"
            >
              {quantity}
            </motion.span>
          </AnimatePresence>
        </div>

        <motion.button
          onClick={onIncrease}
          disabled={atMax}
          whileTap={atMax ? { x: [0, 4, -4, 4, 0] } : { scale: 0.85 }}
          transition={{ duration: 0.3 }}
          className="w-12 h-12 flex items-center justify-center text-[#8e8e9a] hover:text-white hover:bg-white/8 disabled:opacity-25 disabled:cursor-not-allowed transition-colors select-none"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M12 5v14M5 12h14" />
          </svg>
        </motion.button>
      </div>

      <AnimatePresence mode="wait">
        {atMax ? (
          <motion.span
            key="max"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            className="text-xs font-medium text-amber-400"
          >
            {t('product.maxAvailable')}
          </motion.span>
        ) : (
          <motion.span
            key="stock"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            className="text-xs text-[#8e8e9a]"
          >
            {t('product.outOf', { count: stock })}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
