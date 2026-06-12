import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import useChatStore from '@/store/chatStore'
import AIChat from './AIChat'

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

  // Limpia el pendingMessage del store después de que AIChat lo recibe
  useEffect(() => {
    if (isOpen && pendingMessage) clearPending()
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cierra con Escape
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, close])

  // maxHistoryHeight: altura dinámica según viewport, dejando espacio para header + input
  const histHeight = typeof window !== 'undefined' ? Math.max(280, window.innerHeight - 220) : 500

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
            style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
            aria-hidden="true"
          />

          {/* Drawer — slide desde la derecha */}
          <motion.aside
            key="chat-drawer"
            role="dialog"
            aria-label="Asistente HotClick"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
            style={{
              width: 'min(440px, 100vw)',
              background: 'var(--hc-surface)',
              borderLeft: '1px solid var(--hc-border)',
              boxShadow: '-8px 0 48px rgba(0,0,0,0.14)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 px-5 py-4 shrink-0"
              style={{ borderBottom: '1px solid var(--hc-border)' }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--hc-accent)' }}
              >
                <svg className="w-5 h-5" style={{ color: '#fff' }} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate" style={{ color: 'var(--hc-text)' }}>
                  Asistente HotClick
                </p>
                <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                  Te ayudo a encontrar lo que buscás
                </p>
              </div>
              <button
                onClick={close}
                aria-label="Cerrar asistente"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-60 active:scale-95"
                style={{ color: 'var(--hc-muted)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Cuerpo del chat */}
            <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
              <AIChat
                context="GENERAL"
                sessionKey="hotclick"
                chips={CHIPS}
                placeholder="¿Qué estás buscando?"
                autoQuery={pendingMessage || undefined}
                maxHistoryHeight={histHeight}
              />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
