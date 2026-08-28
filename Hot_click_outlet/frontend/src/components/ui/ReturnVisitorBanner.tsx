import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'
import TrustGlyph from '@/components/ui/TrustGlyph'
import CloseIcon from '@/components/ui/CloseIcon'

const FIRST_VISIT_KEY = 'hc-first-visit-ts'
const DISMISSED_KEY   = 'hc-return-banner-dismissed'

type VisitInfo = {
  isReturn: boolean
  daysSince: number
}

function getVisitInfo(): VisitInfo {
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
  const [info, setInfo]       = useState<VisitInfo | null>(null)
  const location  = useLocation()
  const cartItems = useCartStore((s) => s.items)
  const wishCount = useWishlistStore((s) => s.items.length)

  const hiddenPaths = ['/carrito', '/checkout', '/pago']

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
  let greeting = `¡Volviste después de ${days} días!`
  if (days === 0) greeting = '¡Bienvenido de vuelta!'
  else if (days === 1) greeting = '¡Volviste! Te extrañamos.'

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
              <span className="shrink-0" style={{ color: 'var(--hc-accent)' }}>
                <TrustGlyph tipo="clientes" className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <span className="text-xs font-semibold" style={{ color: 'var(--hc-text)' }}>
                  {greeting}{' '}
                </span>
                {cartItems.length > 0 && (
                  <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                    Tenés {cartItems.length} producto{cartItems.length > 1 ? 's' : ''} en el pedido.
                  </span>
                )}
                {!cartItems.length && wishCount > 0 && (
                  <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                    Tenés {wishCount} producto{wishCount > 1 ? 's' : ''} en tu lista de deseos.
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {cartItems.length > 0 && (
                <Link
                  to="/carrito"
                  onClick={dismiss}
                  className="hc-btn hc-btn-primary px-3 py-1 min-h-8 text-xs"
                >
                  Ver pedido
                </Link>
              )}
              {!cartItems.length && wishCount > 0 && (
                <Link
                  to="/wishlist"
                  onClick={dismiss}
                  className="hc-btn hc-btn-primary px-3 py-1 min-h-8 text-xs"
                >
                  Ver favoritos
                </Link>
              )}
              <button type="button"
                onClick={dismiss}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-xs transition-all hover:bg-white/10"
                style={{ color: 'var(--hc-muted)' }}
                aria-label="Cerrar"
              >
                <CloseIcon className="w-3 h-3" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
