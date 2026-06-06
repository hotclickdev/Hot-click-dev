import { useState, useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

const AUTO_DISMISS_MS = 5_000
const MAX_VISIBLE     = 2   // never stack more than 2 at once

/**
 * Floating social-proof notification stack.
 *
 * Receives each new `notification` from `useSocialProof` as a prop.
 * Maintains its own display queue so multiple quick arrivals don't collide.
 *
 * @param {{ id, buyer, action, product } | null} notification
 */
export default function SocialProofToast({ notification }) {
  const [queue, setQueue] = useState([])

  // Push incoming notification into the queue (cap at MAX_VISIBLE)
  useEffect(() => {
    if (!notification) return
    setQueue((prev) => [...prev, notification].slice(-MAX_VISIBLE))
  }, [notification])

  const dismiss = (id) => setQueue((prev) => prev.filter((n) => n.id !== id))

  return (
    // Mobile: above BottomNav (bottom-20); Desktop: bottom-right corner
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-[4.75rem] left-3 right-auto w-[calc(100vw-5.5rem)] max-w-xs sm:bottom-4 sm:left-auto sm:right-4 sm:w-80 z-40 flex flex-col gap-2 pointer-events-none"
    >
      <AnimatePresence initial={false}>
        {queue.map((item) => (
          <ToastItem key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
        ))}
      </AnimatePresence>
    </div>
  )
}

// ── Individual toast item ────────────────────────────────────────────────────

function ToastItem({ item, onDismiss }) {
  const { t } = useTranslation()
  const shouldReduce = useReducedMotion()

  // Auto-dismiss
  useEffect(() => {
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(t)
  }, [onDismiss])

  const variants = shouldReduce
    ? { initial: {}, animate: {}, exit: {} }
    : {
        initial: { opacity: 0, y: 20, scale: 0.96 },
        animate: { opacity: 1, y: 0,  scale: 1 },
        exit:    { opacity: 0, scale: 0.95 },
      }

  const { buyer, action, product } = item

  return (
    <motion.div
      layout
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      role="status"
      className="pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lg"
      style={{
        background:   'var(--hc-surface)',
        border:       '1px solid var(--hc-border)',
        boxShadow:    '0 8px 32px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.04) inset',
      }}
    >
      {/* Left: product thumbnail or action emoji */}
      <div className="shrink-0">
        {product.imagenUrl ? (
          <div
            className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--hc-border)' }}
          >
            <img
              src={product.imagenUrl}
              alt={product.nombre}
              width={40}
              height={40}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ background: 'rgba(79,124,255,0.12)', border: '1px solid rgba(79,124,255,0.25)' }}
          >
            {action.emoji}
          </div>
        )}
      </div>

      {/* Center: message */}
      <div className="flex-1 min-w-0">
        <p className="text-xs leading-snug" style={{ color: 'var(--hc-text)' }}>
          <span className="font-semibold">{buyer.nombre}</span>
          {' '}
          <span style={{ color: 'var(--hc-muted)' }}>{t('socialProofToast.from')} {buyer.ciudad}</span>
          {' '}
          <span>{action.text}</span>
          {' '}
          <span className="font-medium truncate">{product.nombre}</span>
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--hc-muted)' }}>
          {t('socialProofToast.moment')}
        </p>
      </div>

      {/* Right: close + status dot */}
      <div className="shrink-0 flex flex-col items-center gap-1.5">
        <button
          onClick={onDismiss}
          aria-label={t('socialProofToast.closeNotif')}
          className="w-5 h-5 rounded-full flex items-center justify-center transition-colors"
          style={{ color: 'var(--hc-muted)' }}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      </div>
    </motion.div>
  )
}
