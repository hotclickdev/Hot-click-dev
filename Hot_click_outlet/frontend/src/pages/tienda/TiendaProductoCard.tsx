import { Link } from 'react-router-dom'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'
import useWishlistStore from '@/store/wishlistStore'
import { esProductoCotizable, textoPrecioProducto } from '@/utils/precioProducto'
import TiendaPlaceholder from './TiendaPlaceholder'
import type { Producto } from '@/types/producto'

/** Boceto 13: el «+» es secundario (borde n200, 44 × 44) para que «Ver pedido» sea la única CTA roja. */
const CLASE_AGREGAR = 'flex size-11 shrink-0 items-center justify-center rounded-[12px] border border-hc-n-200 bg-hc-n-0 text-hc-n-900 transition-colors hover:bg-hc-n-50'

/**
 * Tarjeta de producto de la tienda del vendedor (Figma `5:23`, 167x280): misma geometría que la del
 * comprador, pero el botón suma al pedido aislado de esta tienda y los productos a cotizar abren su ficha.
 */
export default function TiendaProductoCard({
  slug, producto, vendedor, agregado, onAgregar,
}: {
  slug: string
  producto: Producto
  vendedor: string
  agregado: boolean
  onAgregar: (producto: Producto) => void
}) {
  const toggleFavorito = useWishlistStore((s) => s.toggle)
  const esFavorito = useWishlistStore((s) => s.items.some((i) => i.id === producto.id))
  const destino = `/tienda/${slug}/producto/${producto.id}`
  const nombre = producto.nombre ?? ''

  return (
    <article className="relative flex flex-col overflow-hidden rounded-[14px] border border-[var(--t-border)] bg-[var(--t-surface)]">
      <Link to={destino} className="block aspect-square w-[calc(100%+2px)] shrink-0 overflow-hidden bg-[var(--t-hover)]" tabIndex={-1} aria-hidden="true">
        {producto.imagenUrl
          ? <img src={producto.imagenUrl} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
          : (
            <div className="flex size-full items-center justify-center text-[var(--t-muted)]">
              <TiendaPlaceholder className="size-12" />
            </div>
            )}
      </Link>
      <button
        type="button"
        onClick={() => toggleFavorito(producto)}
        aria-pressed={esFavorito}
        aria-label={esFavorito ? `Quitar ${nombre} de favoritos` : `Guardar ${nombre} en favoritos`}
        className={`absolute right-1.5 top-2 flex size-8 items-center justify-center rounded-full bg-[var(--t-surface)] shadow-[0px_1px_4px_0px_rgba(0,0,0,0.12)] ${esFavorito ? 'text-hc-red-600' : 'text-hc-n-600'}`}
      >
        <IconoFigma src={ICONOS_COMPRADOR.favorito} size={16} />
      </button>
      <div className="flex flex-col gap-[2px] p-[10px]">
        <Link to={destino} className="line-clamp-2 min-h-[34px] text-[13px] font-medium leading-[17px] text-hc-n-900">
          {nombre}
        </Link>
        <p className="truncate text-[11px] leading-[15px] text-hc-n-600">{vendedor}</p>
        <div className="flex items-center justify-between pt-[6px]">
          <p className="whitespace-nowrap font-display text-[15px] font-bold leading-[normal] text-hc-n-900">
            {textoPrecioProducto(producto)}
          </p>
          {esProductoCotizable(producto) ? (
            <Link to={destino} aria-label={`Personalizar ${nombre}`} className={CLASE_AGREGAR}>
              <IconoFigma src={ICONOS_COMPRADOR.agregar} size={16} />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => onAgregar(producto)}
              aria-label={agregado ? `Agregado al pedido: ${nombre}` : `Agregar al pedido: ${nombre}`}
              className={`${CLASE_AGREGAR} ${agregado ? 'text-hc-success-text' : ''}`}
            >
              <IconoFigma src={agregado ? ICONOS_COMPRADOR.agregadoCheck : ICONOS_COMPRADOR.agregar} size={16} />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
