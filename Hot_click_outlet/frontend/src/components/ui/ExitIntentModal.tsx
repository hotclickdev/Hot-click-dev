import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'
import { formatPrice } from '@/utils/format'
import TrustGlyph from '@/components/ui/TrustGlyph'
import CloseIcon from '@/components/ui/CloseIcon'
import type { ItemCarrito } from '@/types/carrito'

const SESSION_KEY = 'hc-exit-intent-shown'
const DELAY_BEFORE_ARMED_MS = 5000
const BLOCKED_PATHS = ['/checkout', '/pago/exito', '/pago/cancelado', '/carrito']
const CART_EXIT_DELAY_MS = 5 * 60 * 1000

export default function ExitIntentModal() {
  const [open, setOpen] = useState(false)
  const armed = useRef(false)
  const prevPathnameRef = useRef<string | null>(null)
  const cartExitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { pathname } = useLocation()
  const cartItems = useCartStore((s) => s.items)
  const cartTotal = useCartStore((s) => s.total)
  const wishItems = useWishlistStore((s) => s.items)

  // Disparador: 5 min después de salir de /carrito
  useEffect(() => {
    const prev = prevPathnameRef.current
    prevPathnameRef.current = pathname

    const leftCart = prev === '/carrito'
    const safeRoute = !BLOCKED_PATHS.some(p => pathname.startsWith(p))

    // Si el usuario vuelve al carrito o llega a checkout, cancelar el timer
    if (pathname === '/carrito' || pathname.startsWith('/checkout') || pathname.startsWith('/pago')) {
      clearTimeout(cartExitTimerRef.current ?? undefined)
      return
    }

    if (!leftCart || !safeRoute) return
    if (sessionStorage.getItem(SESSION_KEY)) return
    if (!cartItems.length) return

    cartExitTimerRef.current = setTimeout(() => {
      if (!sessionStorage.getItem(SESSION_KEY) && cartItems.length > 0) {
        sessionStorage.setItem(SESSION_KEY, '1')
        setOpen(true)
      }
    }, CART_EXIT_DELAY_MS)

    return () => clearTimeout(cartExitTimerRef.current ?? undefined)
  }, [pathname])

  // Disparadores existentes: cursor sale del viewport (desktop) + inactividad (mobile)
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
    const onMouseLeave = (e: MouseEvent) => { if (e.clientY <= 10) trigger() }

    // Mobile: 3 min idle
    let idleTimer: ReturnType<typeof setTimeout> | undefined
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

  const hasCart    = cartItems.length > 0
  const preview    = hasCart ? cartItems : wishItems
  const total      = hasCart ? cartTotal() : null
  const cartSuffix = cartItems.length === 1 ? '' : 's'
  const wishSuffix = wishItems.length === 1 ? '' : 's'

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
                <button type="button"
                  onClick={() => setOpen(false)}
                  className="absolute top-4 right-4 w-7 h-7 rounded-xl flex items-center justify-center text-[#8e8e9a] hover:text-white hover:bg-white/10 transition-all"
                  aria-label="Cerrar"
                >
                  <CloseIcon />
                </button>
                <div className="flex justify-center mb-2" style={{ color: 'var(--hc-accent)' }}>
                  <TrustGlyph tipo={hasCart ? 'bolsa' : 'corazon'} className="w-8 h-8" />
                </div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--hc-text)' }}>
                  {hasCart ? '¡Espera! Tu pedido te espera' : '¡Tus favoritos te esperan!'}
                </h2>
                <p className="text-xs mt-1" style={{ color: 'var(--hc-muted)' }}>
                  {hasCart
                    ? `${cartItems.length} producto${cartSuffix} · ${formatPrice(total)}`
                    : `${wishItems.length} producto${wishSuffix} guardados`}
                </p>
              </div>

              {/* Productos */}
              <div className="px-5 py-4 space-y-2.5">
                {preview.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 flex items-center justify-center" style={{ background: 'var(--hc-bg)' }}>
                      {item.imagenUrl
                        ? <img src={item.imagenUrl} alt={item.nombre} className="w-full h-full object-cover" />
                        : <span className="opacity-30" style={{ color: 'var(--hc-muted)' }}>
                            <TrustGlyph tipo="paquete" className="w-5 h-5" />
                          </span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--hc-text)' }}>{item.nombre}</p>
                      <p className="text-xs font-bold" style={{ color: 'var(--hc-text)' }}>{formatPrice(item.precio)}</p>
                    </div>
                    {hasCart && <span className="text-[10px] shrink-0" style={{ color: 'var(--hc-muted)' }}>×{(item as ItemCarrito).cantidad}</span>}
                  </div>
                ))}
                {preview.length > 3 && (
                  <p className="text-xs text-center" style={{ color: 'var(--hc-muted)' }}>y {preview.length - 3} más</p>
                )}
              </div>

              {/* CTAs */}
              <div className="px-5 pb-5 flex flex-col gap-2">
                <Link
                  to={hasCart ? '/carrito' : '/wishlist'}
                  onClick={() => setOpen(false)}
                  className="hc-btn hc-btn-primary w-full min-h-11"
                >
                  {hasCart ? 'Completar compra' : 'Ver mis favoritos'}
                </Link>
                <button type="button"
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
