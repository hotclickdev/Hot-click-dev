import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '@/utils/format'
import { getOptimizedUrl } from '@/utils/imageUtils'
import Button from '@/components/ui/Button'
import type { Producto } from '@/types/producto'
import { PackagePlaceholder } from './productIcons'

type StickyCartBarProps = {
  product: Producto
  quantity: number
  onDecrease: () => void
  onIncrease: () => void
  onComprarAhora: () => void
  atMax: boolean
  inStock: boolean
}

export default function StickyCartBar({
  product, quantity, onDecrease, onIncrease, onComprarAhora, atMax, inStock,
}: StickyCartBarProps) {
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
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-hc-surface-2 overflow-hidden shrink-0 border border-hc-border">
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
            <p className="text-sm font-bold" style={{ color: 'var(--hc-primary)' }}>{formatPrice(product.precio)}</p>
          </div>
          <p className="text-sm font-bold sm:hidden whitespace-nowrap" style={{ color: 'var(--hc-primary)' }}>{formatPrice(product.precio)}</p>
        </div>

        <div className="flex items-center rounded-xl border overflow-hidden shrink-0" style={{ borderColor: 'var(--hc-border)' }}>
          <button type="button"
            onClick={onDecrease}
            disabled={quantity <= 1}
            aria-label={t('common.previous')}
            className="w-11 h-11 flex items-center justify-center text-hc-muted hover:text-hc-accent disabled:opacity-25 transition-colors select-none text-lg"
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
            className="w-11 h-11 flex items-center justify-center text-hc-muted hover:text-hc-accent disabled:opacity-25 transition-colors select-none text-lg"
          >
            +
          </button>
        </div>

        <Button
          variant="primary"
          className="shrink-0 h-10 px-5 sm:px-7 rounded-xl font-bold text-sm"
          disabled={!inStock}
          onClick={onComprarAhora}
        >
          {t('product.buyNow')}
        </Button>
      </div>
    </motion.div>
  )
}
