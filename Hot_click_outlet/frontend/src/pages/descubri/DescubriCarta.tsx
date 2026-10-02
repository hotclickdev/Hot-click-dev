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
 * Posición de cada carta del mazo respecto de la carta activa (Figma `27:946`):
 * la activa mide 310x460; la 2.ª 284x440 girada 4° al 75 %; la 3.ª 268x440 girada -5° al 50 %.
 */
const POSICION_MAZO = [
  { left: 0, top: 0, ancho: 310, alto: 460, giro: 0, opacidad: 1 },
  { left: -2.7, top: -2.6, ancho: 284, alto: 440, giro: 4, opacidad: 0.75 },
  { left: 39.7, top: -36.5, ancho: 268, alto: 440, giro: -5, opacidad: 0.5 },
] as const

/**
 * Carta del mazo: foto a todo el tamaño con degradé inferior, nombre y negocio · precio.
 * El arrastre horizontal confirma "me gusta" o "saltar".
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
  const giroArrastre = useTransform(x, [-200, 200], [-12, 12])
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

  const pos = POSICION_MAZO[Math.min(stackIndex, POSICION_MAZO.length - 1)]
  const negocio = producto.empresaNombre?.trim()
  const detalle = negocio ? `${negocio} · ${formatPrice(producto.precio)}` : formatPrice(producto.precio)

  return (
    <motion.article
      className={`absolute select-none overflow-hidden rounded-[22px] bg-hc-n-100 ${activo ? 'shadow-[0px_12px_28px_0px_rgba(0,0,0,0.18)]' : ''}`}
      style={{
        left: pos.left,
        top: pos.top,
        width: pos.ancho,
        height: pos.alto,
        opacity: pos.opacidad,
        x: activo ? x : 0,
        rotate: activo ? giroArrastre : pos.giro,
        zIndex: 10 - stackIndex,
        touchAction: activo ? 'none' : 'auto',
      }}
      drag={activo ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      aria-hidden={!activo}
    >
      <img
        src={producto.imagenUrl}
        alt={activo ? producto.nombre : ''}
        className="absolute inset-0 size-full object-cover"
        draggable={false}
      />
      {activo && (
        <>
          <div className="absolute inset-x-0 bottom-0 flex h-[130px] flex-col justify-end gap-[2px] bg-gradient-to-b from-transparent to-black/[0.72] px-4 pb-4 pt-10 leading-[normal] text-hc-n-0">
            <h2 className="truncate font-display text-[18px] font-bold">{producto.nombre}</h2>
            <p className="truncate text-[14px] font-medium">{detalle}</p>
          </div>
          <motion.span
            className="absolute left-5 top-5 -rotate-12 rounded-lg border-[2.5px] px-3 py-1.5 text-sm font-bold"
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
            className="absolute right-5 top-5 rotate-12 rounded-lg border-[2.5px] px-3 py-1.5 text-sm font-bold"
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
    </motion.article>
  )
}
