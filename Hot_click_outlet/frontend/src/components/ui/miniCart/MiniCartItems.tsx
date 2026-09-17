import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '@/utils/format'
import TrustGlyph from '@/components/ui/TrustGlyph'
import type { ItemCarrito } from '@/types/carrito'
import type { Id } from '@/types/api'

type MiniCartItemsProps = {
  items: ItemCarrito[]
  removeItem: (id: Id, cartLineId?: string) => void
  updateQuantity: (id: Id, cantidad: number, cartLineId?: string) => void
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
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium truncate leading-snug" style={{ color: 'var(--hc-text)' }}>
                  {item.nombre}
                </p>
                <p className="text-xs font-bold shrink-0 tabular-nums" style={{ color: 'var(--hc-text)' }}>
                  {formatPrice(item.precio * item.cantidad)}
                </p>
              </div>
              <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--hc-accent)' }}>{formatPrice(item.precio)}</p>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                <div className="flex items-center rounded-lg border overflow-hidden" style={{ borderColor: 'var(--hc-border)' }}>
                  <button type="button"
                    onClick={() => updateQuantity(item.id as Id, item.cantidad - 1, item.cartLineId)}
                    className="w-11 h-11 flex items-center justify-center text-sm transition-colors touch-manipulation"
                    style={{ color: 'var(--hc-muted)' }}
                    aria-label={`Reducir cantidad de ${item.nombre}`}
                  >−</button>
                  <span className="w-7 text-center text-xs font-bold" style={{ color: 'var(--hc-text)' }}>
                    {item.cantidad}
                  </span>
                  <button type="button"
                    onClick={() => updateQuantity(item.id as Id, item.cantidad + 1, item.cartLineId)}
                    disabled={item.cantidad >= (item.stock ?? 99)}
                    className="w-11 h-11 flex items-center justify-center text-sm transition-colors disabled:opacity-25 touch-manipulation"
                    style={{ color: 'var(--hc-muted)' }}
                    aria-label={`Aumentar cantidad de ${item.nombre}`}
                  >+</button>
                </div>
                <button type="button"
                  onClick={() => removeItem(item.id as Id, item.cartLineId)}
                  aria-label={`${t('miniCart.remove')} ${item.nombre}`}
                  className="relative z-10 shrink-0 min-h-11 px-3 text-sm transition-colors hover:text-red-400 active:text-red-400 touch-manipulation"
                  style={{ color: 'var(--hc-muted)' }}
                >
                  {t('miniCart.remove')}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
