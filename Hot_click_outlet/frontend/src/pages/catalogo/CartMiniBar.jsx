import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { formatPrice } from '@/utils/format'
import useCartStore from '@/store/cartStore'

export default function CartMiniBar() {
  const items = useCartStore((s) => s.items)
  const total = useCartStore((s) => s.total)
  const navigate = useNavigate()

  return (
    <AnimatePresence>
      {items.length > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
        >
          <button
            onClick={() => navigate('/carrito')}
            className="pointer-events-auto flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'var(--hc-accent)',
              boxShadow: '0 8px 32px color-mix(in srgb, var(--hc-accent) 45%, transparent), 0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <div className="relative">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white text-[9px] font-bold flex items-center justify-center" style={{ color: 'var(--hc-accent)' }}>
                {items.length}
              </span>
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-white leading-none">Ver carrito</p>
              <p className="text-[10px] text-white/75 mt-0.5">{formatPrice(total())}</p>
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
