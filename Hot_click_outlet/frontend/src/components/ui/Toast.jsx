import { createContext, useContext, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const ToastContext = createContext(null)

let toastId = 0

/**
 * Toasts según Brand Book cap. 7.5: esquina inferior izquierda, fondo neutro 900,
 * radio 12, 5 s (los errores persisten hasta que el usuario los descarte),
 * máximo 3 apilados, icono con color semántico + texto (el color nunca es el
 * único indicador, cap. 9). En móvil se elevan sobre el BottomNav.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback(({ message, type = 'info', duration = 5000 }) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }].slice(-3))
    if (type !== 'error') {
      const filterOut = (prev) => prev.filter((t) => t.id !== id)
      setTimeout(() => setToasts(filterOut), duration)
    }
  }, [])

  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id))

  const ICON_BG = {
    success: 'var(--hc-success)',
    error: 'var(--hc-red-500)',
    warning: 'var(--hc-warning)',
    info: 'var(--hc-blue-500)',
  }
  const ICON = { success: '✓', error: '!', warning: '⚠', info: 'ℹ' }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        className="fixed left-4 z-[9999] flex flex-col gap-2 pointer-events-none
                   bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-4"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              role={t.type === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto flex items-start gap-3 px-4 py-3 max-w-sm"
              style={{
                background: 'var(--hc-n-900)',
                color: '#FFFFFF',
                borderRadius: 12,
                boxShadow: 'var(--hc-shadow-3)',
              }}
            >
              <span
                className="flex items-center justify-center shrink-0 rounded-full text-[11px] font-extrabold"
                style={{ width: 20, height: 20, marginTop: 1, background: ICON_BG[t.type] || ICON_BG.info, color: '#FFFFFF' }}
                aria-hidden="true"
              >
                {ICON[t.type] || ICON.info}
              </span>
              <p className="text-sm leading-snug flex-1">{t.message}</p>
              <button type="button"
                onClick={() => remove(t.id)}
                aria-label="Cerrar notificación"
                className="shrink-0 flex items-center justify-center rounded opacity-60 hover:opacity-100 transition-opacity"
                style={{ width: 18, height: 18, marginTop: 1 }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                </svg>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  // Support both call styles:
  //   const toast = useToast() → toast({ message, type })
  //   const { showToast } = useToast() → showToast(message, type)
  const showToast = (message, type = 'info') => ctx({ message, type })
  return Object.assign(ctx, { showToast })
}
