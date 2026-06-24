import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import useChatStore from '@/store/chatStore'
import useCartStore from '@/store/cartStore'
import AIChat from './AIChat'
import POSPaymentPanel from './POSPaymentPanel'
import { HotClickMark } from '@/components/ui/BrandLogo'

const CHIPS = [
  '¿Qué tenés en oferta?',
  'Algo para la sala',
  'Productos para regalar',
  'Accesorios de cocina',
]

export default function ChatModal() {
  const isOpen         = useChatStore(s => s.isOpen)
  const pendingMessage = useChatStore(s => s.pendingMessage)
  const close          = useChatStore(s => s.close)
  const clearPending   = useChatStore(s => s.clearPending)
  const cartCount      = useCartStore(s => s.items.length)

  const [checkoutMode, setCheckoutMode] = useState(false)

  useEffect(() => {
    const { startExpiryTimer, stopExpiryTimer } = useChatStore.getState()
    startExpiryTimer()
    return () => stopExpiryTimer()
  }, [])

  useEffect(() => {
    if (isOpen && pendingMessage) clearPending()
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen) setCheckoutMode(false)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (checkoutMode) setCheckoutMode(false)
        else close()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, checkoutMode, close])

  const histHeight = typeof window !== 'undefined' ? Math.max(300, window.innerHeight - 200) : 500

  // En mobile (<640px) ocupa pantalla completa; en desktop, drawer fijo 420px desde la izquierda
  const drawerVariants = {
    hidden:  { x: '-100%' },
    visible: { x: 0 },
    exit:    { x: '-100%' },
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="chat-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.30)' }}
            aria-hidden="true"
          />

          {/* Drawer — izquierda en desktop, fullscreen en mobile */}
          <motion.aside
            key="chat-drawer"
            role="dialog"
            aria-label="Asistente HotClick"
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed left-0 top-0 bottom-0 z-50 flex flex-col"
            style={{
              width: 'min(440px, 100vw)',
              background: 'var(--hc-surface)',
              borderRight: '1px solid var(--hc-border)',
              boxShadow: '8px 0 48px rgba(0,0,0,0.12)',
              color: 'var(--hc-text)',
            }}
          >
            {/* Header minimalista */}
            <div
              className="flex items-center gap-3 px-4 py-3.5 shrink-0"
              style={{ borderBottom: '1px solid var(--hc-border)' }}
            >
              {/* Botón volver — solo en modo checkout */}
              {checkoutMode && (
                <button
                  onClick={() => setCheckoutMode(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-60 shrink-0"
                  style={{ color: 'var(--hc-muted)' }}
                  aria-label="Volver al chat"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}

              {/* Logo */}
              {!checkoutMode && <HotClickMark size={32} className="shrink-0" />}

              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm" style={{ color: 'var(--hc-text)' }}>
                  {checkoutMode ? 'Pagar pedido' : 'Asistente HotClick'}
                </p>
                <p className="text-[11px] leading-none mt-0.5" style={{ color: 'var(--hc-muted)' }}>
                  {checkoutMode ? 'Sin salir del chat' : 'Tu guía de compras'}
                </p>
              </div>

              {/* Botón "Pagar ya" */}
              {!checkoutMode && cartCount > 0 && (
                <button
                  onClick={() => setCheckoutMode(true)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:opacity-80 active:scale-95"
                  style={{ background: 'var(--hc-accent)', color: '#fff' }}
                  aria-label="Pagar ahora"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                  Pagar ya
                </button>
              )}

              {/* Cerrar */}
              <button
                onClick={close}
                aria-label="Cerrar asistente"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-60 shrink-0"
                style={{ color: 'var(--hc-muted)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Cuerpo */}
            <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
              <AnimatePresence mode="wait">
                {checkoutMode ? (
                  <motion.div
                    key="checkout"
                    initial={{ opacity: 0, x: -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.18 }}
                  >
                    <POSPaymentPanel onClose={close} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="chat"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 24 }}
                    transition={{ duration: 0.18 }}
                  >
                    <AIChat
                      context="GENERAL"
                      sessionKey="hotclick"
                      chips={CHIPS}
                      placeholder="¿Qué estás buscando?"
                      autoQuery={pendingMessage || undefined}
                      maxHistoryHeight={histHeight}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
