import { useEffect, useRef, useState } from 'react'
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

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export default function ChatModal() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const isOpen = useChatStore(s => s.isOpen)
  const pendingMessage = useChatStore(s => s.pendingMessage)
  const resetCount = useChatStore(s => s.resetCount)
  const close = useChatStore(s => s.close)
  const clearPending = useChatStore(s => s.clearPending)
  const clearConversation = useChatStore(s => s.clearConversation)
  const cartCount = useCartStore(s => s.items.length)
  const chips = [t('chat.chipOffer'), t('chat.chipSala'), t('chat.chipShipping')]
  const viewport = useVisualViewportBox(isOpen)
  const sessionKey = sessionKeyFromPath(pathname)
  const panelRef = useRef<HTMLElement>(null)

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

  useEffect(() => {
    if (!isOpen) return
    const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)
    first?.focus()
  }, [isOpen])

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
            key={`chat-drawer-${sessionKey}-${resetCount}`}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
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
            <ChatHeader
              cartCount={cartCount}
              onBack={close}
              onClear={clearConversation}
              onClose={close}
            />
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

function ChatHeader({
  cartCount,
  onBack,
  onClear,
  onClose,
}: {
  cartCount: number
  onBack: () => void
  onClear: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [confirmClear, setConfirmClear] = useState(false)

  function handleClear() {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    onClear()
    setConfirmClear(false)
  }

  return (
    <div
      className="flex items-center gap-2 px-3 py-3.5 shrink-0"
      style={{ borderBottom: '1px solid var(--hc-border)' }}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label={t('chat.back')}
        title={t('chat.back')}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-60 shrink-0"
        style={{ color: 'var(--hc-muted)' }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
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
      <button
        type="button"
        onClick={handleClear}
        onBlur={() => setConfirmClear(false)}
        aria-label={confirmClear ? t('chat.clearConfirm') : t('chat.clear')}
        title={confirmClear ? t('chat.clearConfirm') : t('chat.clear')}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-60 shrink-0"
        style={{ color: confirmClear ? '#DC2626' : 'var(--hc-muted)' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-7 0h8" />
        </svg>
      </button>
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
