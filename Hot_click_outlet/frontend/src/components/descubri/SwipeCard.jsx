import { Link } from 'react-router-dom'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '@/utils/format'

const SWIPE_THRESHOLD = 90

// Variants de salida: la dirección llega via `custom` desde AnimatePresence
const cardVariants = {
  enter: { scale: 0.96, y: 14, opacity: 0 },
  center: { scale: 1, y: 0, opacity: 1 },
  exit: (dir) => ({
    x: dir === 'like' ? 480 : -480,
    rotate: dir === 'like' ? 14 : -14,
    opacity: 0,
    transition: { duration: 0.28, ease: [0.32, 0.72, 0, 1] },
  }),
}

export default function SwipeCard({ product, isTop, stackIndex, onSwipe }) {
  const { t } = useTranslation()
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-220, 220], [-12, 12])
  const likeOpacity = useTransform(x, [30, 120], [0, 1])
  const skipOpacity = useTransform(x, [-30, -120], [0, 1])

  const handleDragEnd = (_e, info) => {
    const power = info.offset.x + info.velocity.x * 0.25
    if (power > SWIPE_THRESHOLD) onSwipe('like')
    else if (power < -SWIPE_THRESHOLD) onSwipe('skip')
  }

  const precioFinal = product.enOferta && product.precioOferta
    ? product.precioOferta
    : product.precio

  return (
    <motion.article
      variants={cardVariants}
      initial="enter"
      animate={{
        scale: 1 - stackIndex * 0.04,
        y: stackIndex * 12,
        opacity: stackIndex > 1 ? 0 : 1,
      }}
      exit="exit"
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={isTop ? handleDragEnd : undefined}
      style={{
        x,
        rotate: isTop ? rotate : 0,
        zIndex: 10 - stackIndex,
        background: 'var(--hc-surface)',
        border: '1px solid var(--hc-border)',
        boxShadow: isTop ? '0 12px 32px var(--hc-shadow)' : 'none',
      }}
      className="absolute inset-0 rounded-2xl overflow-hidden flex flex-col select-none touch-none cursor-grab active:cursor-grabbing"
      aria-hidden={!isTop}
    >
      {/* Zona de imagen: fondo blanco fijo — las fotos de catálogo son fondo blanco */}
      <div className="relative flex-1 min-h-0 bg-white flex items-center justify-center p-6">
        <img
          src={product.imagenUrl}
          alt={product.nombre}
          className="max-w-full max-h-full object-contain pointer-events-none"
          draggable={false}
          loading={stackIndex === 0 ? 'eager' : 'lazy'}
        />

        {/* Badge de emprendimiento → lleva a su tienda pública */}
        {product.empresaSlug && (
          <Link
            to={`/tienda/${product.empresaSlug}`}
            onPointerDownCapture={(e) => e.stopPropagation()}
            className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-semibold max-w-[70%] truncate"
            style={{ background: 'var(--hc-accent)', color: 'white' }}
          >
            {t('descubri.deEmprendimiento', { nombre: product.empresaNombre })}
          </Link>
        )}

        {product.enOferta && product.porcentajeDescuento > 0 && (
          <span
            className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-bold text-white"
            style={{ background: 'var(--hc-danger)' }}
          >
            -{product.porcentajeDescuento}%
          </span>
        )}

        {/* Sellos de decisión durante el arrastre */}
        {isTop && (
          <>
            <motion.span
              style={{ opacity: likeOpacity, borderColor: 'var(--hc-success)', color: 'var(--hc-success)' }}
              className="absolute top-5 left-5 px-3 py-1.5 rounded-xl border-2 text-sm font-bold uppercase tracking-wider -rotate-12 bg-white/85"
            >
              {t('descubri.stampLike')}
            </motion.span>
            <motion.span
              style={{ opacity: skipOpacity, borderColor: 'var(--hc-muted)', color: 'var(--hc-muted)' }}
              className="absolute top-5 right-5 px-3 py-1.5 rounded-xl border-2 text-sm font-bold uppercase tracking-wider rotate-12 bg-white/85"
            >
              {t('descubri.stampSkip')}
            </motion.span>
          </>
        )}
      </div>

      {/* Info del producto */}
      <div className="px-4 pt-3 pb-4" style={{ borderTop: '1px solid var(--hc-border)' }}>
        <div className="flex items-center gap-2 mb-1 min-h-[18px]">
          {product.marcaNombre && (
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--hc-accent)' }}>
              {product.marcaNombre}
            </span>
          )}
          {product.categoriaNombre && (
            <span className="text-[11px]" style={{ color: 'var(--hc-muted)' }}>
              {product.categoriaNombre}
            </span>
          )}
        </div>
        <h2 className="font-semibold text-base leading-snug line-clamp-2" style={{ color: 'var(--hc-text)' }}>
          {product.nombre}
        </h2>
        <div className="flex items-baseline gap-2 mt-1.5">
          <span className="text-xl font-bold" style={{ color: 'var(--hc-text)' }}>
            {formatPrice(precioFinal)}
          </span>
          {product.enOferta && product.precioOferta && (
            <span className="text-sm line-through" style={{ color: 'var(--hc-muted)' }}>
              {formatPrice(product.precio)}
            </span>
          )}
          {product.stock > 0 && product.stock <= 3 && (
            <span className="ml-auto text-xs font-medium" style={{ color: 'var(--hc-warning)' }}>
              {t('descubri.lowStock', { count: product.stock })}
            </span>
          )}
        </div>
      </div>
    </motion.article>
  )
}
