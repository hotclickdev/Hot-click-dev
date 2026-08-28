import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '@/utils/format'
import TrustGlyph from '@/components/ui/TrustGlyph'
import type { ItemCarrito } from '@/types/carrito'
import type { Id } from '@/types/api'

type MiniCartItemsProps = {
  items: ItemCarrito[]
  removeItem: (id: Id) => void
  updateQuantity: (id: Id, cantidad: number) => void
}

export default function MiniCartItems({ items, removeItem, updateQuantity }: MiniCartItemsProps) {
  const { t } = useTranslation()

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
            transition={{ duration: 0.2 }}
            className="flex gap-3 p-3 rounded-2xl border"
            style={{ background: 'color-mix(in srgb, var(--hc-surface) 60%, transparent)', borderColor: 'var(--hc-border)' }}
          >
            <div className="w-14 h-14 rounded-xl bg-[#1a1a1f] overflow-hidden shrink-0 border border-white/6">
              {item.imagenUrl ? (
                <img src={item.imagenUrl} alt={item.nombre} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <span className="flex items-center justify-center w-full h-full opacity-30" style={{ color: 'var(--hc-muted)' }}>
                  <TrustGlyph tipo="paquete" className="w-6 h-6" />
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate leading-snug" style={{ color: 'var(--hc-text)' }}>
                {item.nombre}
              </p>
              <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--hc-accent)' }}>{formatPrice(item.precio)}</p>

              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center rounded-lg border overflow-hidden" style={{ borderColor: 'var(--hc-border)' }}>
                  <button type="button"
                    onClick={() => updateQuantity(item.id as Id, item.cantidad - 1)}
                    className="w-7 h-7 flex items-center justify-center text-xs transition-colors"
                    style={{ color: 'var(--hc-muted)' }}
                  >−</button>
                  <span className="w-7 text-center text-xs font-bold" style={{ color: 'var(--hc-text)' }}>
                    {item.cantidad}
                  </span>
                  <button type="button"
                    onClick={() => updateQuantity(item.id as Id, item.cantidad + 1)}
                    disabled={item.cantidad >= (item.stock ?? 99)}
                    className="w-7 h-7 flex items-center justify-center text-xs transition-colors disabled:opacity-25"
                    style={{ color: 'var(--hc-muted)' }}
                  >+</button>
                </div>
                <button type="button"
                  onClick={() => removeItem(item.id as Id)}
                  className="text-xs transition-colors hover:text-red-400"
                  style={{ color: 'var(--hc-muted)' }}
                >
                  {t('miniCart.remove')}
                </button>
              </div>
            </div>

            <div className="text-right shrink-0 pt-0.5">
              <p className="text-xs font-bold" style={{ color: 'var(--hc-text)' }}>
                {formatPrice(item.precio * item.cantidad)}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
