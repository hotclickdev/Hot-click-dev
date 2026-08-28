import { motion } from 'framer-motion'
import type { TFunction } from 'i18next'
import type { Producto } from '@/types/producto'

type ProductLowStockAlertProps = {
  product: Producto
  t: TFunction
}

export default function ProductLowStockAlert({ product, t }: ProductLowStockAlertProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 w-fit"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
      <span className="text-xs font-medium text-amber-400">
        {product.stock <= 3
          ? t('product.urgentStock', { count: product.stock })
          : t('product.lowStock', { count: product.stock })}
      </span>
    </motion.div>
  )
}
