import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useWishlistStore from '@/store/wishlistStore'
import { textoPrecioProducto } from '@/utils/precioProducto'
import type { Producto } from '@/types/producto'
import IconoFigma from './IconoFigma'
import { ICONOS_COMPRADOR } from './iconosComprador'
import { useAgregarAlPedido } from './useAgregarAlPedido'
import { fotoProducto, nombreVendedor, stockEscaso } from './productCardHelpers'

type ProductCardProps = {
  product: Producto
  className?: string
  priority?: boolean
}

/** Tarjeta de producto del comprador (Figma `5:23`): foto 1:1, escasez, favorito, vendedor, precio y Agregar. */
export default function ProductCard({ product, className = '', priority = false }: ProductCardProps) {
  const { t } = useTranslation()
  const agregar = useAgregarAlPedido()
  const toggleFavorito = useWishlistStore((s) => s.toggle)
  const esFavorito = useWishlistStore((s) => s.items.some((i) => i.id === product.id))
  const nombre = product.nombre ?? ''
  const foto = fotoProducto(product)
  const quedan = stockEscaso(product)
  const agotado = product.stock === 0
  const destino = `/productos/${product.id}`

  return (
    <article className={`relative flex flex-col overflow-hidden rounded-[14px] border border-hc-n-200 bg-hc-n-0 ${className}`}>
      <Link to={destino} state={{ product }} className="relative block aspect-square overflow-hidden bg-hc-n-100" tabIndex={-1} aria-hidden="true">
        {foto && (
          <img src={foto} alt="" className="size-full object-cover" loading={priority ? 'eager' : 'lazy'} decoding="async" />
        )}
        {quedan != null && (
          <span className="absolute left-2 top-2 rounded-full bg-hc-warning-bg px-2 py-[3px] text-[11px] font-semibold text-hc-warning">
            {t('comprador.tarjeta.quedan', { count: quedan })}
          </span>
        )}
      </Link>
      <button
        type="button"
        onClick={() => toggleFavorito(product)}
        aria-pressed={esFavorito}
        aria-label={t(esFavorito ? 'comprador.tarjeta.favoritoQuitar' : 'comprador.tarjeta.favoritoAgregar', { nombre })}
        className={`absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-hc-n-0 shadow-[0px_1px_4px_0px_rgba(0,0,0,0.12)] ${esFavorito ? 'text-hc-red-500' : 'text-hc-n-600'}`}
      >
        <IconoFigma src={ICONOS_COMPRADOR.favorito} size={16} />
      </button>
      <div className="flex flex-col gap-[2px] p-[10px]">
        <Link to={destino} state={{ product }} className="line-clamp-2 min-h-[34px] text-[13px] font-medium leading-[17px] text-hc-n-900">
          {nombre}
        </Link>
        <p className="truncate text-[11px] leading-[15px] text-hc-n-500">{nombreVendedor(product)}</p>
        <div className="flex items-center justify-between pt-[6px]">
          <p className="font-display text-[15px] font-bold text-hc-n-900">
            {agotado ? t('comprador.tarjeta.agotado') : textoPrecioProducto(product)}
          </p>
          <button
            type="button"
            onClick={() => agregar(product)}
            disabled={agotado}
            aria-label={t('comprador.tarjeta.agregar', { nombre })}
            className="flex size-8 items-center justify-center rounded-[10px] bg-hc-red-500 text-hc-n-0 disabled:opacity-40"
          >
            <IconoFigma src={ICONOS_COMPRADOR.agregar} size={16} />
          </button>
        </div>
      </div>
    </article>
  )
}
