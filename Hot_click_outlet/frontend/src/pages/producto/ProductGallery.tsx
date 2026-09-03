import { useRef, type TouchEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import OptimizedImage from '@/components/ui/OptimizedImage'
import { getOptimizedUrl } from '@/utils/imageUtils'
import type { Producto } from '@/types/producto'
import { PackagePlaceholder } from './productIcons'

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
        className="aspect-[3/2] sm:aspect-square rounded-2xl bg-hc-surface border border-hc-border flex items-center justify-center overflow-hidden touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeImg}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full"
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
          </motion.div>
        </AnimatePresence>
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
    </motion.div>
  )
}
