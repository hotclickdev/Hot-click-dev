import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { RefObject } from 'react'
import SocialProof from '@/components/ui/SocialProof'
import type { Producto } from '@/types/producto'
import { stockDesdeProducto } from './productoHelpers'
import type { VarianteProducto } from './productoHelpers'
import TitleAndBadges from './TitleAndBadges'
import ProductPriceRow from './ProductPriceRow'
import ProductLowStockAlert from './ProductLowStockAlert'
import QuantitySelector from './QuantitySelector'
import ProductBuyActions from './ProductBuyActions'
import TrustBadges from './TrustBadges'

type ProductInfoProps = {
  product: Producto
  variantes: VarianteProducto[]
  tallaSeleccionada: string | null
  onSelectTalla: (talla: string) => void
  quantity: number
  onDecrease: () => void
  onIncrease: () => void
  onAdd: () => void
  onComprarAhora: () => void
  justAdded: boolean
  inStock: boolean
  atMax: boolean
  mainCTARef: RefObject<HTMLButtonElement | null>
}

export default function ProductInfo({
  product,
  variantes,
  tallaSeleccionada,
  onSelectTalla,
  quantity,
  onDecrease,
  onIncrease,
  onAdd,
  onComprarAhora,
  justAdded,
  inStock,
  atMax,
  mainCTARef,
}: ProductInfoProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { badge: stockBadge, label: stockLabel } = stockDesdeProducto(product, t)

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-3 sm:gap-5"
    >
      <TitleAndBadges
        product={product}
        variantes={variantes}
        tallaSeleccionada={tallaSeleccionada}
        onSelectTalla={onSelectTalla}
        stockBadge={stockBadge}
        stockLabel={stockLabel}
        onNavigate={navigate}
        t={t}
      />

      <ProductPriceRow product={product} t={t} />

      <SocialProof productId={product.id} />

      {product.descripcion && (
        <p className="text-sm text-[#8e8e9a] leading-relaxed">{product.descripcion}</p>
      )}

      {inStock && product.stock <= 5 && (
        <ProductLowStockAlert product={product} t={t} />
      )}

      {inStock && (
        <QuantitySelector
          quantity={quantity}
          stock={product.stock}
          atMax={atMax}
          onDecrease={onDecrease}
          onIncrease={onIncrease}
          t={t}
        />
      )}

      <ProductBuyActions
        mainCTARef={mainCTARef}
        inStock={inStock}
        justAdded={justAdded}
        onAdd={onAdd}
        onComprarAhora={onComprarAhora}
        t={t}
      />

      <TrustBadges />
    </motion.div>
  )
}
