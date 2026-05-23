import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import useCartStore from '@/store/cartStore'
import useAuthStore from '@/store/authStore'
import useUiStore from '@/store/uiStore'
import ShippingProgress from '@/components/ui/ShippingProgress'
import { formatPrice } from '@/utils/format'
import { analytics } from '@/utils/analytics'

function useIsDesktop() {
  const [v, setV] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const fn = (e) => setV(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return v
}

export default function MiniCartDrawer() {
  const { items, removeItem, updateQuantity, total } = useCartStore()
  const { token } = useAuthStore()
  const { cartDrawerOpen, setCartDrawerOpen, setAuthPromptOpen } = useUiStore()
  const navigate = useNavigate()
  const location = useLocation()
  const isDesktop = useIsDesktop()

  // Close on route change
  useEffect(() => { setCartDrawerOpen(false) }, [location.pathname])

  // Close on Escape
  useEffect(() => {
    if (!cartDrawerOpen) return
    const handler = (e) => { if (e.key === 'Escape') setCartDrawerOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [cartDrawerOpen])

  // Block body scroll while open
  useEffect(() => {
    document.body.style.overflow = cartDrawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [cartDrawerOpen])

  const spring = { type: 'spring', stiffness: 380, damping: 40 }
  const drawerMotion = isDesktop
    ? { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } }
    : { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }

  const handleCheckout = () => {
    analytics.checkoutStart(total(), items.reduce((s, i) => s + i.cantidad, 0))
    setCartDrawerOpen(false)
    navigate('/checkout')
  }

  return (
    <AnimatePresence>
      {cartDrawerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="cart-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm"
            onClick={() => setCartDrawerOpen(false)}
          />

          {/* Drawer */}
          <motion.div
            key="cart-drawer"
            initial={drawerMotion.initial}
            animate={drawerMotion.animate}
            exit={drawerMotion.exit}
            transition={spring}
            className="fixed z-50 flex flex-col
              inset-x-0 bottom-0 max-h-[88vh] rounded-t-3xl
              md:inset-x-auto md:right-0 md:top-0 md:bottom-auto md:w-96 md:h-full md:max-h-none md:rounded-none"
            style={{
              background: 'var(--hc-surface)',
              borderTop: !isDesktop ? '1px solid var(--hc-border)' : undefined,
              borderLeft: isDesktop ? '1px solid var(--hc-border)' : undefined,
              boxShadow: isDesktop ? '-8px 0 48px rgba(0,0,0,0.3)' : '0 -8px 48px rgba(0,0,0,0.3)',
            }}
          >
            {/* Mobile handle */}
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--hc-border)' }}>
              <div>
                <h2 className="font-bold text-base" style={{ color: 'var(--hc-text)' }}>Tu carrito</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
                  {items.length} {items.length === 1 ? 'producto' : 'productos'}
                </p>
              </div>
              <button
                onClick={() => setCartDrawerOpen(false)}
                className="p-2 rounded-xl transition-colors hover:bg-white/8"
                style={{ color: 'var(--hc-muted)' }}
                aria-label="Cerrar carrito"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Empty state */}
            {items.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-1" style={{ background: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-accent) 20%, transparent)' }}>
                  <svg className="w-8 h-8" style={{ color: 'var(--hc-accent)' }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M1 1h4l2.68 13.39a2 2 0 001.95 1.61h9.72a2 2 0 001.95-1.61L23 6H6" />
                  </svg>
                </div>
                <p className="font-semibold text-sm" style={{ color: 'var(--hc-text)' }}>Tu carrito está vacío</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
                  Agrega productos para continuar
                </p>
                <Link
                  to="/productos"
                  className="hc-btn hc-btn-primary hc-btn-sm mt-2"
                >
                  Explorar productos
                </Link>
              </div>
            )}

            {/* Items list */}
            {items.length > 0 && (
              <>
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  <AnimatePresence>
                    {items.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 16, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex gap-3 p-3 rounded-2xl border"
                        style={{ background: 'color-mix(in srgb, var(--hc-surface) 60%, transparent)', borderColor: 'var(--hc-border)' }}
                      >
                        {/* Image */}
                        <div className="w-14 h-14 rounded-xl bg-[#1a1a1f] overflow-hidden shrink-0 border border-white/6">
                          {item.imagenUrl ? (
                            <img src={item.imagenUrl} alt={item.nombre} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <span className="flex items-center justify-center w-full h-full text-xl">📦</span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate leading-snug" style={{ color: 'var(--hc-text)' }}>
                            {item.nombre}
                          </p>
                          <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--hc-accent)' }}>{formatPrice(item.precio)}</p>

                          {/* Qty controls */}
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center rounded-lg border overflow-hidden" style={{ borderColor: 'var(--hc-border)' }}>
                              <button
                                onClick={() => updateQuantity(item.id, item.cantidad - 1)}
                                className="w-7 h-7 flex items-center justify-center text-xs transition-colors"
                                style={{ color: 'var(--hc-muted)' }}
                              >−</button>
                              <span className="w-7 text-center text-xs font-bold" style={{ color: 'var(--hc-text)' }}>
                                {item.cantidad}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, item.cantidad + 1)}
                                disabled={item.cantidad >= (item.stock ?? 99)}
                                className="w-7 h-7 flex items-center justify-center text-xs transition-colors disabled:opacity-25"
                                style={{ color: 'var(--hc-muted)' }}
                              >+</button>
                            </div>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="text-xs transition-colors hover:text-red-400"
                              style={{ color: 'var(--hc-muted)' }}
                            >
                              Quitar
                            </button>
                          </div>
                        </div>

                        {/* Line total */}
                        <div className="text-right shrink-0 pt-0.5">
                          <p className="text-xs font-bold" style={{ color: 'var(--hc-text)' }}>
                            {formatPrice(item.precio * item.cantidad)}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="px-4 py-4 border-t space-y-3 shrink-0" style={{ borderColor: 'var(--hc-border)' }}>
                  <ShippingProgress total={total()} />

                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm" style={{ color: 'var(--hc-text)' }}>Total</span>
                    <span className="text-xl font-bold" style={{ color: 'var(--hc-text)' }}>{formatPrice(total())}</span>
                  </div>

                  <button
                    onClick={handleCheckout}
                    className="hc-btn hc-btn-primary hc-btn-lg w-full"
                  >
                    Pagar con tarjeta
                  </button>

                  <Link
                    to="/carrito"
                    className="hc-btn hc-btn-outline w-full"
                  >
                    Ver carrito completo
                  </Link>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
