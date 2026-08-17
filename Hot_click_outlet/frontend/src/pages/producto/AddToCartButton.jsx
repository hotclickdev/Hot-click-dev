import { motion, AnimatePresence } from 'framer-motion'

/**
 * CTA principal de agregar al carrito.
 */
export default function AddToCartButton({ mainCTARef, inStock, justAdded, onAdd, t }) {
  return (
    <motion.button
      ref={mainCTARef}
      onClick={onAdd}
      disabled={!inStock}
      whileTap={inStock && !justAdded ? { scale: 0.97 } : {}}
      className={`relative h-14 rounded-2xl font-semibold text-sm overflow-hidden transition-all duration-300 ${claseBotonCarrito(inStock, justAdded)}`}
    >
      <AnimatePresence>
        {justAdded && (
          <motion.span
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-white pointer-events-none"
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {justAdded ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.6, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center gap-2"
          >
            <motion.svg
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <motion.path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </motion.svg>
            <span>{t('product.addedBtn')}</span>
          </motion.div>
        ) : (
          <motion.div
            key="add"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center gap-2.5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M1 1h4l2.68 13.39a2 2 0 001.95 1.61h9.72a2 2 0 001.95-1.61L23 6H6" />
            </svg>
            <span>{inStock ? t('product.addToCart') : t('product.outOfStock')}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

function claseBotonCarrito(inStock, justAdded) {
  if (!inStock) return 'bg-white/5 text-[#8e8e9a] cursor-not-allowed border border-white/8'
  if (justAdded) return 'bg-emerald-500 text-white shadow-[0_0_28px_rgba(16,185,129,0.45)]'
  return 'bg-[#4f7cff] hover:bg-[#3d6ee0] text-white shadow-[0_0_20px_rgba(23,71,168,0.3)] hover:shadow-[0_0_36px_rgba(23,71,168,0.5)]'
}
