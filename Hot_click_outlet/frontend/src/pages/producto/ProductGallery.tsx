import { useRef, useState, type TouchEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import OptimizedImage from '@/components/ui/OptimizedImage'
import { getOptimizedUrl } from '@/utils/imageUtils'
import type { Producto } from '@/types/producto'
import { PackagePlaceholder } from './productIcons'
import ProductGalleryFullscreen from './ProductGalleryFullscreen'

const SWIPE_MIN_PX = 50

type ProductGalleryProps = {
  product: Producto
  galeria: string[]
  activeImg: number
  onSelectImg: (index: number) => void
}

export default function ProductGallery({ product, galeria, activeImg, onSelectImg }: ProductGalleryProps) {
  const altPrincipal = `${product.titulo || product.nombre}${product.marcaNombre ? ` — ${product.marcaNombre}` : ''} | Disponible en Costa Rica`
  const touchStartX = useRef<number | null>(null)
  const [fullscreenOpen, setFullscreenOpen] = useState(false)
  const titulo = product.titulo || product.nombre || ''
  const precioLabel = product.precio != null
    ? `₡${new Intl.NumberFormat('es-CR').format(product.precio)}`
    : undefined

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

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-3"
    >
      <div
        className="relative aspect-[3/2] sm:aspect-square rounded-2xl bg-hc-surface border border-hc-border flex items-center justify-center overflow-hidden touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.button
            type="button"
            key={activeImg}
            onClick={() => galeria[activeImg] && setFullscreenOpen(true)}
            aria-label="Ver galería a pantalla completa"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full cursor-zoom-in"
          >
            {galeria[activeImg] ? (
              <OptimizedImage
                src={galeria[activeImg]}
                alt={altPrincipal}
                width={800}
                height={800}
                className="w-full h-full object-cover"
                priority={true}
                quality={85}
              />
            ) : (
              <span className="flex items-center justify-center w-full h-full opacity-20">
                <PackagePlaceholder className="w-24 h-24" />
              </span>
            )}
          </motion.button>
        </AnimatePresence>

        {galeria[activeImg] && (
          <button
            type="button"
            onClick={() => setFullscreenOpen(true)}
            aria-label="Ampliar foto a pantalla completa"
            className="absolute bottom-2.5 right-2.5 w-9 h-9 rounded-full flex items-center justify-center bg-black/45 text-white backdrop-blur-sm hover:bg-black/60 transition-colors"
          >
            <ExpandSVG />
          </button>
        )}
      </div>

      {galeria.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {galeria.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSelectImg(i)}
              className="shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200"
              style={{
                borderColor: i === activeImg ? 'var(--hc-accent)' : 'transparent',
                opacity: i === activeImg ? 1 : 0.55,
              }}
            >
              <img
                src={getOptimizedUrl(url, { width: 64 })}
                alt={`${product.nombre} ${i + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      <ProductGalleryFullscreen
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        galeria={galeria}
        activeImg={activeImg}
        onSelectImg={onSelectImg}
        titulo={titulo}
        precioLabel={precioLabel}
      />
    </motion.div>
  )
}

function ExpandSVG() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
    </svg>
  )
}
