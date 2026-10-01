import type { ReactNode, RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import useWishlistStore from '@/store/wishlistStore'
import { formatPrice } from '@/utils/format'
import { tieneOfertaActiva } from '@/utils/precioProducto'
import type { Producto } from '@/types/producto'
import type { Id } from '@/types/api'
import { BotonAgotado } from './ProductAgotado'
import { ICONOS_PRODUCTO } from './iconosProducto'

type AccionesCompraProps = {
  /**
   * `barra`: barra de compra fija del móvil (Figma 28:839, nodo 28:977).
   * `inline`: fila de acciones del desktop (Figma 29:2072, nodo 29:2150).
   */
  variante: 'barra' | 'inline'
  product: Producto
  quantity: number
  atMax: boolean
  inStock: boolean
  agotado: boolean
  cotizable: boolean
  justAdded: boolean
  enviandoEncargo: boolean
  turnstileBloqueaSubmit: boolean
  tallaSeleccionada: string | null
  onDecrease: () => void
  onIncrease: () => void
  onAdd: () => void
  mainCTARef?: RefObject<HTMLButtonElement | null>
}

/** Glyph de cantidad (− o +) con un área táctil mayor que el carácter (10 px de ancho en Figma). */
function BotonGlifo({ onClick, disabled, etiqueta, children }: {
  onClick: () => void
  disabled?: boolean
  etiqueta: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={etiqueta}
      className="relative flex w-[10px] items-center justify-center after:absolute after:-inset-x-[6px] after:-inset-y-3 disabled:opacity-30"
    >
      {children}
    </button>
  )
}

export default function AccionesCompra({
  variante, product, quantity, atMax, inStock, agotado, cotizable, justAdded,
  enviandoEncargo, turnstileBloqueaSubmit, tallaSeleccionada, onDecrease, onIncrease, onAdd, mainCTARef,
}: AccionesCompraProps) {
  const { t } = useTranslation()
  const toggleWishlist = useWishlistStore((s) => s.toggle)
  const guardado = useWishlistStore((s) => s.isLiked(product.id as Id))
  const esBarra = variante === 'barra'

  const precioUnitario = tieneOfertaActiva(product) && product.precioOferta != null ? product.precioOferta : product.precio
  const precio = formatPrice(precioUnitario * quantity)
  const conTalla = Boolean(tallaSeleccionada) && !product.esPersonalizado
  let etiqueta = t('product.addToCart')
  if (esBarra) {
    if (product.esPersonalizado) etiqueta = t('product.agregarPersonalizado', { precio })
    else if (conTalla) etiqueta = t('product.agregarTalla', { talla: tallaSeleccionada, precio })
    else etiqueta = t('product.agregarPrecio', { precio })
  }
  if (justAdded) etiqueta = t('product.addedBtn')
  const iconoBoton = esBarra && (product.esPersonalizado || conTalla) ? ICONOS_PRODUCTO.agregarBarra : ICONOS_PRODUCTO.bolsa

  const botonBase = `flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl font-semibold leading-[normal] text-hc-n-0 transition-colors ${
    esBarra ? 'py-[14px] text-[15px]' : 'px-4 py-[15px] text-[16px]'
  }`

  let principal: ReactNode
  if (agotado) {
    principal = <BotonAgotado mainCTARef={esBarra ? undefined : mainCTARef} t={t} />
  } else if (cotizable) {
    principal = (
      <button
        ref={esBarra ? undefined : mainCTARef}
        type="button"
        disabled={enviandoEncargo || turnstileBloqueaSubmit}
        onClick={onAdd}
        className={`${botonBase} bg-hc-red-500 disabled:opacity-60`}
      >
        {enviandoEncargo ? t('product.enviando') : t('product.solicitarEncargo')}
      </button>
    )
  } else {
    principal = (
      <>
        {!product.esPersonalizado && (
        <div
          className={`flex shrink-0 items-center rounded-xl border border-hc-n-200 bg-hc-n-0 font-semibold leading-[normal] text-hc-n-900 ${
            esBarra ? 'gap-[14px] p-3 text-[16px]' : 'gap-[18px] px-4 py-[14px] text-[16px]'
          }`}
        >
          <BotonGlifo onClick={onDecrease} disabled={quantity <= 1} etiqueta={t('product.menosUno')}>−</BotonGlifo>
          <span aria-live="polite" className={`w-[7px] text-center ${esBarra ? 'text-[15px]' : ''}`}>{quantity}</span>
          <BotonGlifo onClick={onIncrease} disabled={atMax || !inStock} etiqueta={t('product.masUno')}>+</BotonGlifo>
        </div>
        )}
        <button
          ref={esBarra ? undefined : mainCTARef}
          type="button"
          onClick={onAdd}
          disabled={!inStock}
          className={`${botonBase} ${justAdded ? 'bg-hc-success' : 'bg-hc-red-500'} disabled:opacity-60`}
        >
          <IconoFigma src={iconoBoton} size={18} className="text-hc-n-0" />
          <span className="whitespace-nowrap">{etiqueta}</span>
        </button>
      </>
    )
  }

  if (esBarra) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-[10px] border-t border-hc-n-200 bg-hc-n-0 px-4 pb-6 pt-3 lg:hidden">
        {principal}
      </div>
    )
  }

  return (
    <div className="hidden items-center gap-[10px] lg:flex">
      {principal}
      <button
        type="button"
        onClick={() => toggleWishlist(product)}
        aria-label={guardado ? t('product.saved') : t('common.save')}
        aria-pressed={guardado}
        className="flex size-[52px] shrink-0 items-center justify-center rounded-xl border border-hc-n-200 bg-hc-n-0 text-hc-n-900"
      >
        <IconoFigma src={ICONOS_PRODUCTO.favoritoEscritorio} size={20} className={guardado ? 'text-hc-red-500' : ''} />
      </button>
    </div>
  )
}
