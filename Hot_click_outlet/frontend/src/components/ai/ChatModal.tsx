import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import useChatStore from '@/store/chatStore'
import useCartStore from '@/store/cartStore'
import AIChat from './AIChat'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_CHAT } from './iconosChat'
import { useVisualViewportBox } from '@/hooks/useVisualViewportBox'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { sessionKeyFromPath } from './aiChat/chatSurface'

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/** Móvil (< 768 px): el asistente es una hoja inferior (Figma `8:231`); en desktop sigue siendo el panel lateral. */
function useEsMovil(): boolean {
  const consulta = '(max-width: 767px)'
  const [movil, setMovil] = useState(() => globalThis.matchMedia?.(consulta).matches ?? false)
  useEffect(() => {
    const lista = globalThis.matchMedia?.(consulta)
    if (!lista) return undefined
    const alCambiar = () => setMovil(lista.matches)
    lista.addEventListener('change', alCambiar)
    return () => lista.removeEventListener('change', alCambiar)
  }, [])
  return movil
}

/** Distancia entre el borde superior y la hoja en móvil (Figma `8:231`). */
const MARGEN_SUPERIOR_HOJA = 82

export default function ChatModal() {
  const { t } = useTranslation()
  const esMovil = useEsMovil()
  const { pathname } = useLocation()
  const isOpen = useChatStore(s => s.isOpen)
  const pendingMessage = useChatStore(s => s.pendingMessage)
  const contexto = useChatStore(s => s.contexto)
  const resetCount = useChatStore(s => s.resetCount)
  const close = useChatStore(s => s.close)
  const clearPending = useChatStore(s => s.clearPending)
  const clearConversation = useChatStore(s => s.clearConversation)
  const cartCount = useCartStore(s => s.items.length)
  const chips = [t('chat.chipOffer'), t('chat.chipSala'), t('chat.chipShipping')]
  const viewport = useVisualViewportBox(isOpen)
  const sessionKey = sessionKeyFromPath(pathname)
  const panelRef = useRef<HTMLElement>(null)
  // Tab no sale del asistente y al cerrar el foco vuelve a quien lo abrió (el primer foco lo pone el efecto de abajo).
  useFocusTrap(panelRef, isOpen, 'ninguno')

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
            style={{ background: esMovil ? 'var(--hc-n-900)' : 'rgba(0,0,0,0.30)' }}
            aria-hidden="true"
          />
          <motion.aside
            key={`chat-drawer-${sessionKey}-${resetCount}-${esMovil ? 'hoja' : 'panel'}`}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('chat.title')}
            initial={esMovil ? { y: '100%' } : { x: '-100%' }}
            animate={esMovil ? { y: 0 } : { x: 0 }}
            exit={esMovil ? { y: '100%' } : { x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className={`hc-drawer-surface fixed z-50 flex flex-col ${esMovil ? 'inset-x-0 mx-auto max-w-[480px] overflow-hidden rounded-t-[22px]' : 'left-0'}`}
            style={esMovil
              ? {
                top: viewport.offsetTop + MARGEN_SUPERIOR_HOJA,
                height: Math.max(0, viewport.height - MARGEN_SUPERIOR_HOJA),
                background: 'var(--hc-n-0)',
                color: 'var(--hc-n-900)',
              }
              : {
                top: viewport.offsetTop,
                height: viewport.height,
                width: 'min(440px, 100vw)',
                background: 'var(--hc-n-0)',
                borderRight: '1px solid var(--hc-n-200)',
                boxShadow: '8px 0 48px rgba(0,0,0,0.12)',
                color: 'var(--hc-n-900)',
              }}
          >
            {esMovil && <span aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-[2px] bg-hc-n-200" />}
            <ChatHeader
              cartCount={cartCount}
              onClear={clearConversation}
              onClose={close}
            />
            <div className="min-h-0 flex-1 overflow-hidden">
              <AIChat
                context={contexto ?? 'GENERAL'}
                sessionKey={sessionKey}
                chips={chips}
                placeholder={t('chat.placeholder')}
                autoQuery={pendingMessage || undefined}
                fullHeight
                variante="hoja"
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
  onClear,
  onClose,
}: {
  cartCount: number
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
    <div className="flex shrink-0 items-center gap-[10px] px-4 pb-3 pt-[10px]">
      <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-hc-blue-600 text-hc-n-0">
        <IconoFigma src={ICONOS_CHAT.asistente16} size={16} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col leading-[normal]">
        <p className="truncate font-display text-[15px] font-bold text-hc-n-900">{t('chat.title')}</p>
        <p className="truncate text-[11px] text-hc-n-600">{t('chat.subtitle')}</p>
      </div>
      {cartCount > 0 && (
        <Link
          to="/checkout"
          onClick={onClose}
          className="flex min-h-9 shrink-0 items-center rounded-full bg-hc-blue-600 px-3 text-xs font-bold text-hc-n-0"
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
        className={`flex shrink-0 ${confirmClear ? 'text-hc-danger' : 'text-hc-n-600'}`}
      >
        <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-7 0h8" />
        </svg>
      </button>
      <button type="button" onClick={onClose} aria-label={t('chat.close')} className="flex shrink-0 text-hc-n-600">
        <IconoFigma src={ICONOS_CHAT.cerrar20} size={20} />
      </button>
    </div>
  )
}
