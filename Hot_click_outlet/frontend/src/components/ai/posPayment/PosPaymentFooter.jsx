import { motion, AnimatePresence } from 'framer-motion'
import { fmt } from './posPaymentConstants'

/**
 * Error, botón de confirmar y términos del checkout embebido.
 */
export default function PosPaymentFooter({
  error,
  isFailed,
  payError,
  onSubmit,
  isSubmitting,
  itemCount,
  totalFinal,
}) {
  return (
    <>
      <AnimatePresence>
        {(error || (isFailed && payError)) && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-xs px-3 py-2 rounded-lg"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error || payError}
          </motion.p>
        )}
      </AnimatePresence>

      <button type="button"
        onClick={onSubmit}
        disabled={isSubmitting || itemCount === 0}
        className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
        style={{ background: 'var(--hc-accent)', color: '#fff' }}
      >
        {isSubmitting ? 'Procesando...' : `Confirmar pedido · ₡${fmt(totalFinal)}`}
      </button>

      <p className="text-center text-[10px]" style={{ color: 'var(--hc-muted)' }}>
        Al confirmar aceptás los términos de compra de HotClick.
      </p>
    </>
  )
}
