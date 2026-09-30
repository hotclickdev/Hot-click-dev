import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { TurnstileInstance } from '@marsidev/react-turnstile'
import SocialProof from '@/components/ui/SocialProof'
import Button from '@/components/ui/Button'
import TurnstileCampo from '@/components/security/TurnstileCampo'
import type { Producto } from '@/types/producto'
import type { PersonalizacionCarrito } from '@/types/carrito'
import { esProductoCotizable, stockDesdeProducto } from './productoHelpers'
import type { VarianteProducto } from './productoHelpers'
import TitleAndBadges from './TitleAndBadges'
import ProductPriceRow from './ProductPriceRow'
import ProductLowStockAlert from './ProductLowStockAlert'
import FormularioAvisoReposicion from './FormularioAvisoReposicion'
import { AlternativasAgotado, BotonAgotado } from './ProductAgotado'
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
  turnstileSiteKey?: string
  turnstileRef?: RefObject<TurnstileInstance | null>
  setTurnstileToken?: Dispatch<SetStateAction<string>>
  turnstileBloqueaSubmit?: boolean
  /** Recomendaciones con stock para la ficha agotada ("Parecidos disponibles"). */
  parecidos?: Producto[]
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
  turnstileSiteKey,
  turnstileRef,
  setTurnstileToken,
  turnstileBloqueaSubmit = false,
  parecidos = [],
}: ProductInfoProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { badge: stockBadge, label: stockLabel } = stockDesdeProducto(product, t)
  const token = useAuthStore(s => s.token)
  const esCotizable = esProductoCotizable(product)
  const requiereContacto = esCotizable && !token
  const agotado = !inStock && !esCotizable

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
        agotado={agotado}
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

      {agotado && (
        <>
          <FormularioAvisoReposicion product={product} t={t} />
          <AlternativasAgotado product={product} parecidos={parecidos} t={t} />
        </>
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

      {esCotizable && (
        <>
          {turnstileSiteKey && turnstileRef && setTurnstileToken && (
            <TurnstileCampo
              siteKey={turnstileSiteKey}
              turnstileRef={turnstileRef}
              setTurnstileToken={setTurnstileToken}
            />
          )}
          <Button
            ref={mainCTARef}
            variant="primary"
            size="xl"
            className="w-full h-14 rounded-2xl text-sm font-semibold"
            disabled={enviandoEncargo || turnstileBloqueaSubmit}
            onClick={onAdd}
          >
            {enviandoEncargo ? 'Enviando…' : 'Solicitar encargo'}
          </Button>
        </>
      )}

      {agotado && <BotonAgotado mainCTARef={mainCTARef} t={t} />}

      {inStock && !esCotizable && (
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
