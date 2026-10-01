import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { TurnstileInstance } from '@marsidev/react-turnstile'
import TurnstileCampo from '@/components/security/TurnstileCampo'
import useAuthStore from '@/store/authStore'
import type { Producto } from '@/types/producto'
import type { PersonalizacionCarrito } from '@/types/carrito'
import { esProductoCotizable } from './productoHelpers'
import type { VarianteProducto } from './productoHelpers'
import ProductoCabecera from './ProductoCabecera'
import ColorSwatches from './ColorSwatches'
import SizeSelector from './SizeSelector'
import PersonalizacionPanel from './PersonalizacionPanel'
import { AvisameAgotado } from './ProductAgotado'
import AccionesCompra from './AccionesCompra'
import BloqueEntregaPago from './BloqueEntregaPago'
import PreguntaProducto from './PreguntaProducto'
import ReportarProductoButton from './ReportarProductoButton'

type ProductInfoProps = {
  product: Producto
  variantes: VarianteProducto[]
  tallaSeleccionada: string | null
  onSelectTalla: (talla: string) => void
  quantity: number
  onDecrease: () => void
  onIncrease: () => void
  onAdd: () => void
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
  /** Estilo móvil de los frames de estado (variantes, personalizado, agotado). */
  compacta: boolean
}

/**
 * Columna de compra de la ficha. En móvil los bloques se apilan a sangre (Figma 28:839, 44:1775,
 * 44:1849, 44:1917); en desktop son la columna derecha de 508 px (Figma 29:2072). La barra de compra
 * fija del móvil y la fila de acciones del desktop son la misma pieza en dos variantes.
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
  personalizacion,
  onPersonalizacionChange,
  contactoEncargo,
  onContactoEncargoChange,
  enviandoEncargo,
  turnstileSiteKey,
  turnstileRef,
  setTurnstileToken,
  turnstileBloqueaSubmit = false,
  compacta,
}: ProductInfoProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)
  const esCotizable = esProductoCotizable(product)
  const requiereContacto = esCotizable && !token
  const agotado = !inStock && !esCotizable

  const acciones = {
    product, quantity, atMax, inStock, agotado, cotizable: esCotizable, justAdded, enviandoEncargo,
    turnstileBloqueaSubmit, tallaSeleccionada, onDecrease, onIncrease, onAdd,
  }

  return (
    <div className="flex min-w-0 flex-col lg:gap-4">
      <ProductoCabecera product={product} agotado={agotado} compacta={compacta} />

      <ColorSwatches product={product} variantes={variantes} onNavigate={navigate} t={t} />
      <SizeSelector
        product={product}
        variantes={variantes}
        tallaSeleccionada={tallaSeleccionada}
        onSelectTalla={onSelectTalla}
        onNavigate={navigate}
        t={t}
      />

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

      {esCotizable && turnstileSiteKey && turnstileRef && setTurnstileToken && (
        <div className="px-4 pt-2 lg:p-0">
          <TurnstileCampo siteKey={turnstileSiteKey} turnstileRef={turnstileRef} setTurnstileToken={setTurnstileToken} />
        </div>
      )}

      {agotado && <AvisameAgotado product={product} t={t} />}

      <AccionesCompra variante="inline" mainCTARef={mainCTARef} {...acciones} />
      <AccionesCompra variante="barra" {...acciones} />

      {!agotado && (
        <>
          <BloqueEntregaPago />
          <PreguntaProducto product={product} />
        </>
      )}

      {product.id != null && (
        <div className="px-4 pb-4 lg:p-0">
          <ReportarProductoButton productoId={product.id} />
        </div>
      )}
    </div>
  )
}
