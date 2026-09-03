import { motion } from 'framer-motion'
import useWishlistStore from '@/store/wishlistStore'
import type { TFunction } from 'i18next'
import type { Producto } from '@/types/producto'
import type { Id } from '@/types/api'
import HeartDetailIcon from './HeartDetailIcon'
import { textoPrecioProducto } from '@/utils/precioProducto'

type ProductPriceRowProps = {
  product: Producto
  t: TFunction
}

export default function ProductPriceRow({ product, t }: ProductPriceRowProps) {
  const toggleWishlist = useWishlistStore((s) => s.toggle)
  const isLiked = useWishlistStore((s) => s.isLiked)

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-3xl sm:text-4xl font-bold text-hc-text">
        {textoPrecioProducto(product)}
      </span>
      <motion.button
        onClick={() => toggleWishlist(product)}
        whileTap={{ scale: 0.78 }}
        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
          isLiked(product.id as Id)
            ? 'bg-red-500/10 border-red-500/30 text-red-400'
            : 'border-hc-border text-hc-muted hover:text-hc-accent hover:border-[color:var(--hc-border-strong)]'
        }`}
      >
        <HeartDetailIcon filled={isLiked(product.id as Id)} />
        <span className="hidden sm:inline">{isLiked(product.id as Id) ? t('product.saved') : t('common.save')}</span>
      </motion.button>
    </div>
  )
}
