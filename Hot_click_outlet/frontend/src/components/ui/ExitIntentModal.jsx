import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useCartStore from '@/store/cartStore'
import { formatPrice } from '@/utils/format'

const SESSION_KEY = 'hc-exit-intent-shown'

// Show after this many ms if user already had items when they entered
const ENTRY_DELAY_MS = 12_000   // 12 s
// Show after this many ms of browsing (cart may have been filled after load)
const BROWSE_DELAY_MS = 150_000 // 2.5 min

export default function ExitIntentModal() {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const items = useCartStore((s) => s.items)
  const total = useCartStore((s) => s.total)

  const dismiss = useCallback(() => {
    setVisible(false)
    sessionStorage.setItem(SESSION_KEY, '1')
  }, [])

  const show = useCallback(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return
    setVisible(true)
  }, [])

  // Timer: show 12 s after entry if cart already had items (returning visitor)
  useEffect(() => {
    if (items.length === 0) return
    if (sessionStorage.getItem(SESSION_KEY)) return
    const t = setTimeout(show, ENTRY_DELAY_MS)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally run only on mount

  // Timer: show after 2.5 min regardless of when items were added
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return
    const t = setTimeout(() => {
      if (useCartStore.getState().items.length > 0) show()
    }, BROWSE_DELAY_MS)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Desktop-only: detect mouse leaving viewport through the top
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (items.length === 0) return
    if (sessionStorage.getItem(SESSION_KEY)) return
    if (window.innerWidth < 768) return

    const handler = (e) => {
      if (e.clientY <= 2) show()
    }
    document.addEventListener('mouseleave', handler)
    return () => document.removeEventListener('mouseleave', handler)
  }, [items.length, show])

  useEffect(() => {
    if (!visible) return
    const handler = (e) => { if (e.key === 'Escape') dismiss() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [visible, dismiss])

  if (items.length === 0) return null

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            key="exit-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-sm"
            onClick={dismiss}
          />

          <motion.div
            key="exit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exit-title"
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -12 }}
            transition={{ type: 'spring', stiffness: 400, damping: 36 }}
            className="fixed z-[71] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-sm"
          >
            <div
              className="rounded-3xl p-6 relative"
              style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}
            >
              <button
                onClick={dismiss}
                className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors hover:bg-white/8"
                style={{ color: 'var(--hc-muted)' }}
                aria-label="Cerrar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-accent) 20%, transparent)' }}
                >
                  <svg className="w-7 h-7 text-[#4f7cff]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M1 1h4l2.68 13.39a2 2 0 001.95 1.61h9.72a2 2 0 001.95-1.61L23 6H6" />
                  </svg>
                </div>
              </div>

              {/* Copy */}
              <div className="text-center mb-4">
                <h3 id="exit-title" className="font-bold text-base mb-1.5" style={{ color: 'var(--hc-text)' }}>
                  {t('exitIntent.title')}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
                  {t('exitIntent.cartHas')}{' '}
                  <strong style={{ color: 'var(--hc-text)' }}>
                    {items.length} {t('exitIntent.item', { count: items.length })}
                  </strong>.
                </p>
              </div>

              {/* Mini items preview */}
              <div className="space-y-2 mb-4">
                {items.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
                    style={{ background: 'color-mix(in srgb, var(--hc-surface-2, #1a1a1f) 80%, transparent)', border: '1px solid var(--hc-border)' }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#1a1a1f] overflow-hidden shrink-0">
                      {item.imagenUrl && (
                        <img src={item.imagenUrl} alt={item.nombre} className="w-full h-full object-cover" loading="lazy" />
                      )}
                    </div>
                    <p className="flex-1 text-xs truncate" style={{ color: 'var(--hc-text)' }}>{item.nombre}</p>
                    <span className="text-xs font-semibold text-[#4f7cff] shrink-0">
                      {formatPrice(item.precio * item.cantidad)}
                    </span>
                  </div>
                ))}
                {items.length > 3 && (
                  <p className="text-center text-xs" style={{ color: 'var(--hc-muted)' }}>
                    {t('exitIntent.more', { count: items.length - 3 })}
                  </p>
                )}
              </div>

              {/* Total */}
              <div
                className="flex justify-between items-center py-3 mb-4 border-t border-b"
                style={{ borderColor: 'var(--hc-border)' }}
              >
                <span className="text-sm font-medium" style={{ color: 'var(--hc-muted)' }}>{t('exitIntent.total')}</span>
                <span className="font-bold text-lg" style={{ color: 'var(--hc-text)' }}>{formatPrice(total())}</span>
              </div>

              {/* CTAs */}
              <div className="flex flex-col gap-2">
                <Link
                  to="/checkout"
                  onClick={dismiss}
                  className="block w-full text-center py-3 rounded-xl bg-[#4f7cff] hover:bg-[#3d6ee0] text-white font-semibold text-sm transition-all shadow-[0_0_20px_rgba(79,124,255,0.3)] hover:shadow-[0_0_32px_rgba(79,124,255,0.45)]"
                >
                  {t('exitIntent.checkout')}
                </Link>
                <button
                  onClick={dismiss}
                  className="w-full py-2.5 rounded-xl text-sm transition-colors hover:bg-white/5"
                  style={{ color: 'var(--hc-muted)' }}
                >
                  {t('exitIntent.continue')}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
