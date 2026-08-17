import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '@/utils/format'

export default function ProductCardBody({ product, stockColor, stockText, added, onAddToCart }) {
  const { t } = useTranslation()

  return (
    <div className="p-4 sm:p-5 flex flex-col gap-2.5">
      {product.marcaNombre && (
        <span
          className="inline-block text-[10px] font-bold uppercase tracking-widest rounded-full w-fit"
          style={{
            padding: '3px 10px',
            background: 'color-mix(in srgb, var(--hc-accent) 11%, transparent)',
            color: 'var(--hc-accent)',
            border: '1px solid color-mix(in srgb, var(--hc-accent) 24%, transparent)',
          }}
        >
          {product.marcaNombre}
        </span>
      )}

      <h3 className="hc-product-name font-semibold text-sm sm:text-[15px] leading-snug line-clamp-2">
        {product.nombre}
      </h3>

      <div className="flex items-end justify-between gap-2">
        <span
          className="text-lg sm:text-xl leading-none"
          style={{ color: 'var(--hc-text)', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.02em' }}
        >
          {formatPrice(product.precio)}
        </span>
        <div className="flex items-center gap-1.5 shrink-0 pb-0.5">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: stockColor }}
          />
          <span
            className="text-[10px] font-semibold"
            style={{ color: stockColor }}
          >
            {stockText}
          </span>
        </div>
      </div>

      <p className="text-[11px] leading-none -mt-0.5" style={{ color: 'var(--hc-muted)' }}>
        {t('products.shippingBenefit', 'Envío a todo Costa Rica · 1–5 días')}
      </p>

      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={onAddToCart}
        disabled={product.stock === 0}
        className="w-full flex items-center justify-center gap-2 h-9 rounded-xl text-sm font-semibold transition-all duration-200 mt-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: added
            ? 'color-mix(in srgb, #10b981 15%, transparent)'
            : 'color-mix(in srgb, var(--hc-accent) 10%, transparent)',
          color: added ? '#10b981' : 'var(--hc-accent)',
          border: `1.5px solid ${added
            ? 'color-mix(in srgb, #10b981 30%, transparent)'
            : 'color-mix(in srgb, var(--hc-accent) 25%, transparent)'}`,
        }}
      >
        {added ? (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Agregado
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Agregar al carrito
          </>
        )}
      </motion.button>

    </div>
  )
}
