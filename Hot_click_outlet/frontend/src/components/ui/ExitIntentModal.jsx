import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'
import { formatPrice } from '@/utils/format'

const SESSION_KEY = 'hc-exit-intent-shown'
const DELAY_BEFORE_ARMED_MS = 5000
const BLOCKED_PATHS = ['/checkout', '/pago/exito', '/pago/cancelado', '/carrito']

export default function ExitIntentModal() {
  const [open, setOpen] = useState(false)
  const armed = useRef(false)
  const { pathname } = useLocation()
  const cartItems = useCartStore((s) => s.items)
  const cartTotal = useCartStore((s) => s.total)
  const wishItems = useWishlistStore((s) => s.items)

  useEffect(() => {
    if (BLOCKED_PATHS.some(p => pathname.startsWith(p))) return
    if (sessionStorage.getItem(SESSION_KEY)) return
    if (!cartItems.length && !wishItems.length) return

    const armTimer = setTimeout(() => { armed.current = true }, DELAY_BEFORE_ARMED_MS)

    const trigger = () => {
      if (!armed.current || sessionStorage.getItem(SESSION_KEY)) return
      sessionStorage.setItem(SESSION_KEY, '1')
      setOpen(true)
    }

    // Desktop: cursor exits from top of viewport
    const onMouseLeave = (e) => { if (e.clientY <= 10) trigger() }

    // Mobile: 3 min idle
    let idleTimer
    const resetIdle = () => {
      clearTimeout(idleTimer)
      idleTimer = setTimeout(trigger, 3 * 60 * 1000)
    }
    const touchEvents = ['touchstart', 'touchend']
    touchEvents.forEach((ev) => document.addEventListener(ev, resetIdle, { passive: true }))
    resetIdle()

    document.addEventListener('mouseleave', onMouseLeave)
    return () => {
      clearTimeout(armTimer)
      clearTimeout(idleTimer)
      document.removeEventListener('mouseleave', onMouseLeave)
      touchEvents.forEach((ev) => document.removeEventListener(ev, resetIdle))
    }
  }, [cartItems.length, wishItems.length])

  const hasCart  = cartItems.length > 0
  const preview  = hasCart ? cartItems : wishItems
  const total    = hasCart ? cartTotal() : null

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9990] bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 24 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed inset-0 z-[9991] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-sm rounded-3xl overflow-hidden"
              style={{
                background: 'var(--hc-surface)',
                border: '1px solid var(--hc-border)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
              }}
            >
              {/* Header */}
              <div
                className="relative px-6 pt-6 pb-4 text-center"
                style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--hc-accent) 12%, transparent), color-mix(in srgb, #ec4899 8%, transparent))' }}
              >
                <button
                  onClick={() => setOpen(false)}
                  className="absolute top-4 right-4 w-7 h-7 rounded-xl flex items-center justify-center text-[#8e8e9a] hover:text-white hover:bg-white/10 transition-all"
                >✕</button>
                <div className="text-3xl mb-2">{hasCart ? '🛒' : '❤️'}</div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--hc-text)' }}>
                  {hasCart ? '¡Espera! Tu carrito te necesita' : '¡Tus favoritos te esperan!'}
                </h2>
                <p className="text-xs mt-1" style={{ color: 'var(--hc-muted)' }}>
                  {hasCart
                    ? `${cartItems.length} producto${cartItems.length > 1 ? 's' : ''} · ${formatPrice(total)}`
                    : `${wishItems.length} producto${wishItems.length > 1 ? 's' : ''} guardados`}
                </p>
              </div>

              {/* Productos */}
              <div className="px-5 py-4 space-y-2.5">
                {preview.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 flex items-center justify-center" style={{ background: 'var(--hc-bg)' }}>
                      {item.imagenUrl
                        ? <img src={item.imagenUrl} alt={item.nombre} className="w-full h-full object-cover" />
                        : <span className="text-lg opacity-30">📦</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--hc-text)' }}>{item.nombre}</p>
                      <p className="text-xs font-bold text-[#4f7cff]">{formatPrice(item.precio)}</p>
                    </div>
                    {hasCart && <span className="text-[10px] shrink-0" style={{ color: 'var(--hc-muted)' }}>×{item.cantidad}</span>}
                  </div>
                ))}
                {preview.length > 3 && (
                  <p className="text-xs text-center" style={{ color: 'var(--hc-muted)' }}>+ {preview.length - 3} más</p>
                )}
              </div>

              {/* CTAs */}
              <div className="px-5 pb-5 flex flex-col gap-2">
                <Link
                  to={hasCart ? '/carrito' : '/wishlist'}
                  onClick={() => setOpen(false)}
                  className="w-full h-10 rounded-xl flex items-center justify-center text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: 'var(--hc-accent)', boxShadow: '0 0 20px color-mix(in srgb, var(--hc-accent) 35%, transparent)' }}
                >
                  {hasCart ? 'Completar compra' : 'Ver mis favoritos'}
                </Link>
                <button
                  onClick={() => setOpen(false)}
                  className="w-full h-9 rounded-xl text-xs font-medium transition-all hover:bg-white/5"
                  style={{ color: 'var(--hc-muted)' }}
                >
                  Seguir explorando
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
