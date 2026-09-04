import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '@/utils/format'
import { UMBRAL_ARRASTRE_PX } from '@/utils/gustos'
import type { Producto } from '@/types/producto'

type DescubriCartaProps = {
  producto: Producto
  activo: boolean
  stackIndex: number
  onLike: () => void
  onSkip: () => void
}

/**
 * Carta fullscreen del mazo: foto, precio y badge de negocio.
 * Drag horizontal confirma like/skip.
 */
export default function DescubriCarta({
  producto,
  activo,
  stackIndex,
  onLike,
  onSkip,
}: DescubriCartaProps) {
  const { t } = useTranslation()
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-12, 12])
  const likeOpacity = useTransform(x, [40, UMBRAL_ARRASTRE_PX], [0, 1])
  const skipOpacity = useTransform(x, [-UMBRAL_ARRASTRE_PX, -40], [1, 0])

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (!activo) return
    if (info.offset.x > UMBRAL_ARRASTRE_PX) {
      onLike()
      return
    }
    if (info.offset.x < -UMBRAL_ARRASTRE_PX) onSkip()
  }

  const offsetY = stackIndex * 8
  const scale = 1 - stackIndex * 0.04
  const negocio = producto.empresaNombre?.trim()

  return (
    <motion.article
      className="absolute inset-0 flex flex-col rounded-3xl overflow-hidden select-none"
      style={{
        x: activo ? x : 0,
        rotate: activo ? rotate : stackIndex % 2 === 0 ? -3 : 4,
        y: offsetY,
        scale,
        zIndex: 10 - stackIndex,
        background: 'var(--hc-surface)',
        border: '1px solid var(--hc-border)',
        boxShadow: '0 12px 40px var(--hc-shadow)',
        touchAction: activo ? 'none' : 'auto',
      }}
      drag={activo ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      aria-hidden={!activo}
    >
      <div className="relative flex-1 min-h-0 bg-[var(--hc-surface-2)]">
        <img
          src={producto.imagenUrl}
          alt={producto.nombre}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
        {activo && (
          <>
            <motion.span
              className="absolute top-5 left-5 px-3 py-1.5 rounded-lg text-sm font-bold border-[2.5px] -rotate-12"
              style={{
                opacity: skipOpacity,
                color: 'var(--hc-danger)',
                borderColor: 'var(--hc-danger)',
                background: 'color-mix(in srgb, var(--hc-surface) 88%, transparent)',
              }}
            >
              {t('descubri.stampSkip')}
            </motion.span>
            <motion.span
              className="absolute top-5 right-5 px-3 py-1.5 rounded-lg text-sm font-bold border-[2.5px] rotate-12"
              style={{
                opacity: likeOpacity,
                color: 'var(--hc-success)',
                borderColor: 'var(--hc-success)',
                background: 'color-mix(in srgb, var(--hc-surface) 88%, transparent)',
              }}
            >
              {t('descubri.stampLike')}
            </motion.span>
          </>
        )}
      </div>

      <div className="p-4 sm:p-5 shrink-0">
        {negocio && (
          <p className="text-xs font-semibold mb-1 truncate" style={{ color: 'var(--hc-accent)' }}>
            {t('descubri.fromBusiness', { name: negocio })}
          </p>
        )}
        <h2
          className="text-base sm:text-lg font-bold leading-snug line-clamp-2"
          style={{ color: 'var(--hc-text)', fontFamily: 'var(--font-display)' }}
        >
          {producto.nombre}
        </h2>
        <p className="mt-1.5 text-lg font-bold" style={{ color: 'var(--hc-primary)' }}>
          {formatPrice(producto.precio)}
        </p>
      </div>
    </motion.article>
  )
}
