import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import SocialProof from '@/components/ui/SocialProof'
import { stockDesdeProducto } from './productoHelpers'
import TitleAndBadges from './TitleAndBadges'
import ProductPriceRow from './ProductPriceRow'
import ProductLowStockAlert from './ProductLowStockAlert'
import QuantitySelector from './QuantitySelector'
import AddToCartButton from './AddToCartButton'
import TrustBadges from './TrustBadges'

/**
 * Columna de ficha: título, precio, cantidad y CTA.
 */
export default function ProductInfo({
  product,
  variantes,
  tallaSeleccionada,
  onSelectTalla,
  quantity,
  onDecrease,
  onIncrease,
  onAdd,
  justAdded,
  inStock,
  atMax,
  mainCTARef,
}) {
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

      <AddToCartButton
        mainCTARef={mainCTARef}
        inStock={inStock}
        justAdded={justAdded}
        onAdd={onAdd}
        t={t}
      />

      <TrustBadges />
    </motion.div>
  )
}
