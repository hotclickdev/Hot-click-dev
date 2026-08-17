import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useCartStore from '@/store/cartStore'
import useUiStore from '@/store/uiStore'
import { analytics } from '@/utils/analytics'
import { isBrowser } from '@/utils/browser'
import MiniCartEmpty from '@/components/ui/miniCart/MiniCartEmpty'
import MiniCartItems from '@/components/ui/miniCart/MiniCartItems'
import MiniCartFooter from '@/components/ui/miniCart/MiniCartFooter'

function useIsDesktop() {
  const [v, setV] = useState(() => isBrowser && globalThis.innerWidth >= 768)
  useEffect(() => {
    const mq = globalThis.matchMedia('(min-width: 768px)')
    const fn = (e) => setV(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return v
}

export default function MiniCartDrawer() {
  const { t } = useTranslation()
  const { items, removeItem, updateQuantity, total } = useCartStore()
  const { cartDrawerOpen, setCartDrawerOpen } = useUiStore()
  const navigate = useNavigate()
  const location = useLocation()
  const isDesktop = useIsDesktop()

  useEffect(() => { setCartDrawerOpen(false) }, [location.pathname])

  useEffect(() => {
    if (!cartDrawerOpen) return
    const handler = (e) => { if (e.key === 'Escape') setCartDrawerOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [cartDrawerOpen])

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
          <motion.div
            key="cart-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm"
            onClick={() => setCartDrawerOpen(false)}
          />

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
              borderTop: isDesktop ? undefined : '1px solid var(--hc-border)',
              borderLeft: isDesktop ? '1px solid var(--hc-border)' : undefined,
              boxShadow: isDesktop ? '-8px 0 48px rgba(0,0,0,0.3)' : '0 -8px 48px rgba(0,0,0,0.3)',
            }}
          >
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--hc-border)' }}>
              <div>
                <h2 className="font-bold text-base" style={{ color: 'var(--hc-text)' }}>{t('miniCart.title')}</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
                  {items.length} {t('miniCart.item', { count: items.length })}
                </p>
              </div>
              <button type="button"
                onClick={() => setCartDrawerOpen(false)}
                className="p-2 rounded-xl transition-colors hover:bg-white/8"
                style={{ color: 'var(--hc-muted)' }}
                aria-label={t('miniCart.close')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {items.length === 0 && <MiniCartEmpty />}

            {items.length > 0 && (
              <>
                <MiniCartItems items={items} removeItem={removeItem} updateQuantity={updateQuantity} />
                <MiniCartFooter total={total} onCheckout={handleCheckout} />
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
