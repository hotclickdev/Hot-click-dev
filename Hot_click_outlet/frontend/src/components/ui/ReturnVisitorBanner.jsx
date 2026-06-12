import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'

const FIRST_VISIT_KEY = 'hc-first-visit-ts'
const DISMISSED_KEY   = 'hc-return-banner-dismissed'

function getVisitInfo() {
  const now = Date.now()
  const first = localStorage.getItem(FIRST_VISIT_KEY)
  if (!first) {
    localStorage.setItem(FIRST_VISIT_KEY, String(now))
    return { isReturn: false, daysSince: 0 }
  }
  const daysSince = Math.floor((now - Number(first)) / (1000 * 60 * 60 * 24))
  return { isReturn: true, daysSince }
}

export default function ReturnVisitorBanner() {
  const [visible, setVisible] = useState(false)
  const [info, setInfo]       = useState(null)
  const location  = useLocation()
  const cartItems = useCartStore((s) => s.items)
  const wishCount = useWishlistStore((s) => s.items.length)

  const hiddenPaths = ['/carrito', '/checkout']

  useEffect(() => {
    if (hiddenPaths.some(p => location.pathname.startsWith(p))) return
    if (sessionStorage.getItem(DISMISSED_KEY)) return
    const visitInfo = getVisitInfo()
    if (!visitInfo.isReturn) return
    if (!cartItems.length && !wishCount) return
    setInfo(visitInfo)
    setVisible(true)
  }, [location.pathname])

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1')
    setVisible(false)
  }

  if (!info) return null

  const days = info.daysSince
  const greeting = days === 0
    ? '¡Bienvenido de vuelta!'
    : days === 1
    ? '¡Volviste! Te extrañamos.'
    : `¡Volviste después de ${days} días!`

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
          style={{ borderBottom: '1px solid var(--hc-border)' }}
        >
          <div
            className="flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5"
            style={{ background: 'linear-gradient(90deg, color-mix(in srgb, var(--hc-accent) 8%, transparent), color-mix(in srgb, #ec4899 5%, transparent))' }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-base shrink-0">👋</span>
              <div className="min-w-0">
                <span className="text-xs font-semibold" style={{ color: 'var(--hc-text)' }}>
                  {greeting}{' '}
                </span>
                {cartItems.length > 0 && (
                  <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                    Tienes {cartItems.length} producto{cartItems.length > 1 ? 's' : ''} en el carrito.
                  </span>
                )}
                {!cartItems.length && wishCount > 0 && (
                  <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                    Tienes {wishCount} producto{wishCount > 1 ? 's' : ''} en tu lista de deseos.
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {cartItems.length > 0 && (
                <Link
                  to="/carrito"
                  onClick={dismiss}
                  className="px-3 py-1 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: 'var(--hc-accent)' }}
                >
                  Ver carrito
                </Link>
              )}
              {!cartItems.length && wishCount > 0 && (
                <Link
                  to="/wishlist"
                  onClick={dismiss}
                  className="px-3 py-1 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: 'var(--hc-accent)' }}
                >
                  Ver favoritos
                </Link>
              )}
              <button
                onClick={dismiss}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-xs transition-all hover:bg-white/10"
                style={{ color: 'var(--hc-muted)' }}
              >✕</button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
