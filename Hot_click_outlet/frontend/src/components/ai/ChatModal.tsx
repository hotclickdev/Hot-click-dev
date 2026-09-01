import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import useChatStore from '@/store/chatStore'
import useCartStore from '@/store/cartStore'
import AIChat from './AIChat'
import { HotClickMark } from '@/components/ui/BrandLogo'
import CloseIcon from '@/components/ui/CloseIcon'
import { useVisualViewportBox } from '@/hooks/useVisualViewportBox'
import { sessionKeyFromPath } from './aiChat/chatSurface'

export default function ChatModal() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const isOpen = useChatStore(s => s.isOpen)
  const pendingMessage = useChatStore(s => s.pendingMessage)
  const close = useChatStore(s => s.close)
  const clearPending = useChatStore(s => s.clearPending)
  const cartCount = useCartStore(s => s.items.length)
  const chips = [t('chat.chipOffer'), t('chat.chipSala'), t('chat.chipShipping')]
  const viewport = useVisualViewportBox(isOpen)
  const sessionKey = sessionKeyFromPath(pathname)

  useEffect(() => {
    const { startExpiryTimer, stopExpiryTimer } = useChatStore.getState()
    startExpiryTimer()
    return () => stopExpiryTimer()
  }, [])

  useEffect(() => {
    if (isOpen && pendingMessage) clearPending()
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    globalThis.addEventListener('keydown', onKey)
    return () => globalThis.removeEventListener('keydown', onKey)
  }, [isOpen, close])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
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
          <motion.aside
            key={`chat-drawer-${sessionKey}`}
            role="dialog"
            aria-label={t('chat.title')}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="hc-drawer-surface fixed left-0 z-50 flex flex-col"
            style={{
              top: viewport.offsetTop,
              height: viewport.height,
              width: 'min(440px, 100vw)',
              background: 'var(--hc-surface)',
              borderRight: '1px solid var(--hc-border)',
              boxShadow: '8px 0 48px rgba(0,0,0,0.12)',
              color: 'var(--hc-text)',
            }}
          >
            <ChatHeader cartCount={cartCount} onClose={close} />
            <div className="flex-1 min-h-0 overflow-hidden">
              <AIChat
                context="GENERAL"
                sessionKey={sessionKey}
                chips={chips}
                placeholder={t('chat.placeholder')}
                autoQuery={pendingMessage || undefined}
                fullHeight
              />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function ChatHeader({ cartCount, onClose }: { cartCount: number; onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5 shrink-0"
      style={{ borderBottom: '1px solid var(--hc-border)' }}
    >
      <HotClickMark size={32} className="shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm" style={{ color: 'var(--hc-text)' }}>{t('chat.title')}</p>
        <p className="text-[11px] leading-none mt-0.5" style={{ color: 'var(--hc-muted)' }}>{t('chat.subtitle')}</p>
      </div>
      {cartCount > 0 && (
        <Link
          to="/checkout"
          onClick={onClose}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold min-h-11 transition-all hover:opacity-80"
          style={{ background: 'var(--hc-accent)', color: '#fff' }}
        >
          {t('chat.goCheckout')}
        </Link>
      )}
      <button type="button"
        onClick={onClose}
        aria-label={t('chat.close')}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-60 shrink-0"
        style={{ color: 'var(--hc-muted)' }}
      >
        <CloseIcon className="w-5 h-5" />
      </button>
    </div>
  )
}
