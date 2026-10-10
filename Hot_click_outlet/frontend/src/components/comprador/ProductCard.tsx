import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useWishlistStore from '@/store/wishlistStore'
import { textoPrecioProducto } from '@/utils/precioProducto'
import { formatPrice } from '@/utils/format'
import type { Producto } from '@/types/producto'
import IconoFigma from './IconoFigma'
import { ICONOS_COMPRADOR } from './iconosComprador'
import favoritoActivo from '@/assets/figma/comprador/favorito-activo.svg'
import { useAgregarAlPedido } from './useAgregarAlPedido'
import { SIZES_TARJETA, srcSetResponsivo } from '@/utils/imagenResponsiva'
import { fotoProducto, insigniaTarjeta, nombreVendedor, precioDesde, precioListaTachado, tarjetaAgotada } from './productCardHelpers'

type ProductCardProps = {
  product: Producto
  className?: string
  priority?: boolean
}

const CLASE_INSIGNIA = 'absolute left-2 top-2 rounded-full px-2 py-[3px] text-[11px] font-semibold leading-[13px]'
const COLOR_INSIGNIA = {
  hechoAPedido: 'bg-hc-warning-bg text-hc-warning',
  quedan: 'bg-hc-warning-bg text-hc-warning',
  oferta: 'bg-hc-red-50 text-hc-red-600',
} as const

/**
 * Tarjeta de producto del comprador (Figma `5:23`, 167x280): foto 1:1, una insignia
 * (Hecho a pedido, Quedan N u Oferta), favorito, nombre, vendedor, precio y Agregar.
 * La foto ocupa todo el ancho de la tarjeta, borde incluido, como en Figma: 1 + 167 + 111 + 1 = 280.
 * El favorito (right-1.5) parte del borde interior: queda a 8 px del borde de la foto, que sobresale 2 px.
 */
export default function ProductCard({ product, className = '', priority = false }: ProductCardProps) {
  const { t } = useTranslation()
  const agregar = useAgregarAlPedido()
  const toggleFavorito = useWishlistStore((s) => s.toggle)
  const esFavorito = useWishlistStore((s) => s.items.some((i) => i.id === product.id))
  const nombre = product.nombre ?? ''
  const foto = fotoProducto(product)
  const insignia = insigniaTarjeta(product)
  const precioLista = precioListaTachado(product)
  const agotado = tarjetaAgotada(product)
  const desde = agotado ? null : precioDesde(product)
  const destino = `/productos/${product.id}`

  return (
    <article className={`relative flex flex-col overflow-hidden rounded-[14px] border border-hc-n-200 bg-hc-n-0 ${className}`}>
      <Link to={destino} state={{ product }} className="relative block aspect-square w-[calc(100%+2px)] shrink-0 overflow-hidden bg-hc-n-100" tabIndex={-1} aria-hidden="true">
        {foto && (
          <img src={foto} srcSet={srcSetResponsivo(foto)} sizes={SIZES_TARJETA} width={400} height={400} alt="" className="size-full object-cover" loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" />
        )}
        {insignia && (
          <span className={`${CLASE_INSIGNIA} ${COLOR_INSIGNIA[insignia.tipo]}`}>
            {insignia.tipo === 'quedan'
              ? t('comprador.tarjeta.quedan', { count: insignia.cantidad })
              : t(`comprador.tarjeta.${insignia.tipo}`)}
          </span>
        )}
      </Link>
      <button
        type="button"
        onClick={() => toggleFavorito(product)}
        aria-pressed={esFavorito}
        aria-label={t(esFavorito ? 'comprador.tarjeta.favoritoQuitar' : 'comprador.tarjeta.favoritoAgregar', { nombre })}
        className={`absolute right-1.5 top-2 flex size-8 items-center justify-center rounded-full bg-hc-n-0 shadow-[0px_1px_4px_0px_rgba(0,0,0,0.12)] ${esFavorito ? 'text-hc-red-600' : 'text-hc-n-600'}`}
      >
        <IconoFigma src={esFavorito ? favoritoActivo : ICONOS_COMPRADOR.favorito} size={16} />
      </button>
      <div className="flex flex-col gap-[2px] p-[10px]">
        <Link to={destino} state={{ product }} className="line-clamp-2 min-h-[34px] text-[13px] font-medium leading-[17px] text-hc-n-900">
          {nombre}
        </Link>
        <p className="truncate text-[11px] leading-[15px] text-hc-n-600">{nombreVendedor(product)}</p>
        <div className="flex items-center justify-between pt-[6px]">
          <p className="flex min-w-0 flex-wrap items-baseline gap-x-1 pr-1 font-display text-[15px] font-bold leading-[normal] text-hc-n-900">
            {desde != null && (
              <span className="w-full font-sans text-[11px] font-normal leading-[normal] text-hc-n-600">{t('comprador.tarjeta.desde')}</span>
            )}
            <span className="whitespace-nowrap">
              {agotado ? t('comprador.tarjeta.agotado') : desde != null ? formatPrice(desde) : textoPrecioProducto(product)}
            </span>
            {precioLista != null && (
              <s className="font-sans text-[11px] font-normal leading-[normal] text-hc-n-600">
                <span className="sr-only">{t('comprador.tarjeta.precioAnterior')} </span>
                {formatPrice(precioLista)}
              </s>
            )}
          </p>
          <button
            type="button"
            onClick={() => agregar(product)}
            disabled={agotado}
            aria-label={t('comprador.tarjeta.agregar', { nombre })}
            className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-hc-red-500 text-hc-n-0 disabled:opacity-40"
          >
            <IconoFigma src={ICONOS_COMPRADOR.agregar} size={16} />
          </button>
        </div>
      </div>
    </article>
  )
}
