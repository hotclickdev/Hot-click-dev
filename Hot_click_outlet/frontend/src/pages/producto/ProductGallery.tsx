import { useRef, useState, type TouchEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { puedeVolverAtras } from '@/components/comprador/header/headerHelpers'
import OptimizedImage from '@/components/ui/OptimizedImage'
import { useToast } from '@/components/ui/Toast'
import useWishlistStore from '@/store/wishlistStore'
import { formatPrice } from '@/utils/format'
import { getOptimizedUrl } from '@/utils/imageUtils'
import type { Producto } from '@/types/producto'
import type { Id } from '@/types/api'
import BotonCirculoGaleria from './BotonCirculoGaleria'
import { compartirProducto } from './compartirProducto'
import { ICONOS_PRODUCTO } from './iconosProducto'
import { PackagePlaceholder } from './productIcons'
import ProductGalleryFullscreen from './ProductGalleryFullscreen'

const SWIPE_MIN_PX = 50

type ProductGalleryProps = {
  product: Producto
  galeria: string[]
  activeImg: number
  onSelectImg: (index: number) => void
  /**
   * Móvil de 360 px de alto con botones planos (Figma 44:1775, 44:1849 y 44:1917: ficha con
   * variantes, personalizada y agotada). Sin esto: 390 px con indicador de puntos (28:839).
   */
  compacta?: boolean
  /**
   * Ficha agotada móvil (Figma 44:1919): rectángulo blanco opaco de 390x360 sobre la foto, por
   * debajo de los botones y del contador. Desktop no tiene frame de agotado y muestra la foto.
   */
  cubierta?: boolean
}

export default function ProductGallery({ product, galeria, activeImg, onSelectImg, compacta = false, cubierta = false }: ProductGalleryProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const toggleWishlist = useWishlistStore((s) => s.toggle)
  const isLiked = useWishlistStore((s) => s.isLiked)
  const touchStartX = useRef<number | null>(null)
  const [fullscreenOpen, setFullscreenOpen] = useState(false)

  const titulo = product.titulo || product.nombre || ''
  const altPrincipal = `${titulo}${product.marcaNombre ? ` — ${product.marcaNombre}` : ''} | Disponible en Costa Rica`
  const precioLabel = product.precio != null ? formatPrice(product.precio) : undefined
  const guardado = isLiked(product.id as Id)
  const estiloBoton = compacta ? 'estado' : 'principal'
  const tamanoIcono = compacta ? 18 : 19.2
  const iconos = compacta
    ? { atras: ICONOS_PRODUCTO.atras, compartir: ICONOS_PRODUCTO.compartir, favorito: ICONOS_PRODUCTO.favorito }
    : { atras: ICONOS_PRODUCTO.atras19, compartir: ICONOS_PRODUCTO.compartir19, favorito: ICONOS_PRODUCTO.favorito19 }

  function onTouchStart(e: TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null
  }

  function onTouchEnd(e: TouchEvent) {
    if (touchStartX.current == null || galeria.length <= 1) return
    const endX = e.changedTouches[0]?.clientX
    if (endX == null) return
    const dx = endX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) < SWIPE_MIN_PX) return
    if (dx < 0) onSelectImg(Math.min(activeImg + 1, galeria.length - 1))
    else onSelectImg(Math.max(activeImg - 1, 0))
  }

  function volver() {
    if (puedeVolverAtras(window.history.state)) navigate(-1)
    else navigate('/productos')
  }

  async function compartir() {
    const resultado = await compartirProducto(titulo)
    if (resultado === 'copiado') toast({ message: t('product.enlaceCopiado'), type: 'success' })
  }

  const contador = `${activeImg + 1} / ${galeria.length}`

  return (
    <div className="lg:flex lg:gap-3">
      {galeria.length > 1 && (
        <div className="hidden lg:flex lg:flex-col lg:gap-[10px]">
          {galeria.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSelectImg(i)}
              aria-label={t('product.verFoto', { n: i + 1 })}
              aria-current={i === activeImg}
              className={`relative size-[72px] shrink-0 overflow-hidden rounded-[10px] ${
                i === activeImg ? 'border-2 border-hc-blue-600' : 'border border-hc-n-200'
              }`}
            >
              <img
                src={getOptimizedUrl(url, { width: 144 })}
                alt=""
                className="size-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      <div
        className={`relative w-full touch-pan-y overflow-hidden bg-hc-n-100 lg:aspect-square lg:h-auto lg:w-auto lg:min-w-0 lg:flex-1 lg:rounded-[18px] ${
          compacta ? 'h-[360px]' : 'h-[390px]'
        }`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <button
          type="button"
          onClick={() => galeria[activeImg] && setFullscreenOpen(true)}
          aria-label={t('product.galeriaAbrir')}
          className="absolute inset-0 cursor-zoom-in"
        >
          {galeria[activeImg] ? (
            <OptimizedImage
              src={galeria[activeImg]}
              alt={altPrincipal}
              width={1120}
              height={1120}
              className="size-full object-cover"
              priority={true}
              quality={85}
            />
          ) : (
            <span className="flex size-full items-center justify-center opacity-20">
              <PackagePlaceholder className="size-24" />
            </span>
          )}
        </button>

        {cubierta && <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-hc-n-0 lg:hidden" />}

        <div
          className={`absolute inset-x-4 flex items-center justify-between lg:hidden ${compacta ? 'top-3' : 'top-4'}`}
        >
          <BotonCirculoGaleria onClick={volver} etiqueta={t('common.back')} estilo={estiloBoton}>
            <IconoFigma src={iconos.atras} size={tamanoIcono} />
          </BotonCirculoGaleria>
          <div className={`flex items-center ${compacta ? 'gap-2' : 'gap-[10px]'}`}>
            <BotonCirculoGaleria onClick={() => void compartir()} etiqueta={t('product.share')} estilo={estiloBoton}>
              <IconoFigma src={iconos.compartir} size={tamanoIcono} />
            </BotonCirculoGaleria>
            <BotonCirculoGaleria
              onClick={() => toggleWishlist(product)}
              etiqueta={guardado ? t('product.saved') : t('common.save')}
              estilo={estiloBoton}
              pulsado={guardado}
            >
              <IconoFigma src={iconos.favorito} size={tamanoIcono} className={guardado ? 'text-hc-red-500' : ''} />
            </BotonCirculoGaleria>
          </div>
        </div>

        {galeria.length > 1 && !compacta && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-[22px] left-[calc(50%-26px)] flex items-center gap-[6px] lg:hidden"
          >
            {galeria.slice(0, 4).map((_, i) => (
              <span
                key={i}
                className={`h-[6px] rounded-[3px] ${i === activeImg ? 'w-[18px] bg-hc-n-0' : 'w-[6px] bg-hc-n-200 opacity-80'}`}
              />
            ))}
          </div>
        )}

        {galeria.length > 1 && (
          <span
            className={`pointer-events-none absolute rounded-full bg-black/55 leading-[normal] text-hc-n-0 lg:hidden ${
              compacta
                ? 'bottom-[14px] right-[13px] px-[10px] py-[4px] font-mono text-[11px] font-medium'
                : 'bottom-[15px] right-[19px] px-2 py-[3px] text-[11px] font-semibold leading-[13px]'
            }`}
          >
            {contador}
          </span>
        )}
      </div>

      <ProductGalleryFullscreen
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        galeria={galeria}
        activeImg={activeImg}
        onSelectImg={onSelectImg}
        titulo={titulo}
        precioLabel={precioLabel}
      />
    </div>
  )
}
