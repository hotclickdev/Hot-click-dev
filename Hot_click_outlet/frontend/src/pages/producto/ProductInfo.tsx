import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { RefObject } from 'react'
import SocialProof from '@/components/ui/SocialProof'
import Button from '@/components/ui/Button'
import type { Producto } from '@/types/producto'
import type { PersonalizacionCarrito } from '@/types/carrito'
import { stockDesdeProducto } from './productoHelpers'
import type { VarianteProducto } from './productoHelpers'
import TitleAndBadges from './TitleAndBadges'
import ProductPriceRow from './ProductPriceRow'
import ProductLowStockAlert from './ProductLowStockAlert'
import QuantitySelector from './QuantitySelector'
import ProductBuyActions from './ProductBuyActions'
import TrustBadges from './TrustBadges'
import PersonalizacionPanel from './PersonalizacionPanel'
import ReportarProductoButton from './ReportarProductoButton'
import useAuthStore from '@/store/authStore'

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
  personalizacion: PersonalizacionCarrito
  onPersonalizacionChange: (p: PersonalizacionCarrito) => void
  contactoEncargo: { nombre: string; email: string; telefono: string }
  onContactoEncargoChange: (c: { nombre: string; email: string; telefono: string }) => void
  enviandoEncargo: boolean
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
  personalizacion,
  onPersonalizacionChange,
  contactoEncargo,
  onContactoEncargoChange,
  enviandoEncargo,
}: ProductInfoProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { badge: stockBadge, label: stockLabel } = stockDesdeProducto(product, t)
  const token = useAuthStore(s => s.token)
  const esCotizable = product.esPersonalizado && product.modoPrecioPersonalizado !== 'FIJO'
  const requiereContacto = esCotizable && !token

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
        <p className="text-sm text-hc-muted leading-relaxed">{product.descripcion}</p>
      )}

      {product.esPersonalizado && (
        <PersonalizacionPanel
          product={product}
          tallaSeleccionada={tallaSeleccionada}
          personalizacion={personalizacion}
          onChange={onPersonalizacionChange}
          contacto={contactoEncargo}
          onContactoChange={onContactoEncargoChange}
          requiereContacto={requiereContacto}
        />
      )}

      {inStock && product.stock <= 5 && !esCotizable && (
        <ProductLowStockAlert product={product} t={t} />
      )}

      {inStock && !esCotizable && (
        <QuantitySelector
          quantity={quantity}
          stock={product.stock}
          atMax={atMax}
          onDecrease={onDecrease}
          onIncrease={onIncrease}
          t={t}
        />
      )}

      {esCotizable ? (
        <Button
          ref={mainCTARef}
          variant="primary"
          size="xl"
          className="w-full h-14 rounded-2xl text-sm font-semibold"
          disabled={enviandoEncargo}
          onClick={onAdd}
        >
          {enviandoEncargo ? 'Enviando…' : 'Solicitar encargo'}
        </Button>
      ) : (
        <ProductBuyActions
          mainCTARef={mainCTARef}
          inStock={inStock}
          justAdded={justAdded}
          onAdd={onAdd}
          onComprarAhora={onComprarAhora}
          t={t}
        />
      )}

      <TrustBadges />
      {product.id != null && <ReportarProductoButton productoId={product.id} />}
    </motion.div>
  )
}
