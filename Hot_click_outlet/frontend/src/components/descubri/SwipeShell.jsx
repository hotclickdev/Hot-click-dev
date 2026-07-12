import { motion, useMotionValue, useTransform } from 'framer-motion'

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

// Shell compartido de arrastre: drag en x, rotación, stack y sellos de decisión.
// Lo usan SwipeCard (producto) y SpecialCard (info/empresa) para que ambas
// compartan los mismos variants de AnimatePresence y el mismo gesto.
export default function SwipeShell({ isTop, stackIndex, onSwipe, stamps, children }) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-220, 220], [-12, 12])
  const likeOpacity = useTransform(x, [30, 120], [0, 1])
  const skipOpacity = useTransform(x, [-30, -120], [0, 1])

  const handleDragEnd = (_e, info) => {
    const power = info.offset.x + info.velocity.x * 0.25
    if (power > SWIPE_THRESHOLD) onSwipe('like')
    else if (power < -SWIPE_THRESHOLD) onSwipe('skip')
  }

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
      {children}

      {/* Sellos de decisión durante el arrastre */}
      {isTop && stamps && (
        <>
          <motion.span
            style={{ opacity: likeOpacity, borderColor: 'var(--hc-success)', color: 'var(--hc-success)' }}
            className="absolute top-5 left-5 z-20 px-3 py-1.5 rounded-xl border-2 text-sm font-bold uppercase tracking-wider -rotate-12 bg-white/85"
          >
            {stamps.like}
          </motion.span>
          <motion.span
            style={{ opacity: skipOpacity, borderColor: 'var(--hc-muted)', color: 'var(--hc-muted)' }}
            className="absolute top-5 right-5 z-20 px-3 py-1.5 rounded-xl border-2 text-sm font-bold uppercase tracking-wider rotate-12 bg-white/85"
          >
            {stamps.skip}
          </motion.span>
        </>
      )}
    </motion.article>
  )
}
