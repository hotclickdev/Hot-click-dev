import { createContext, useContext, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const ToastContext = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback(({ message, type = 'info', duration = 4000 }) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }, [])

  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id))

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={() => remove(t.id)}
              className={`
                pointer-events-auto cursor-pointer
                flex items-start gap-3 px-4 py-3 rounded-xl max-w-sm
                backdrop-blur-xl border shadow-xl
                ${t.type === 'success' ? 'bg-emerald-950/80 border-emerald-500/25 text-emerald-200' : ''}
                ${t.type === 'error' ? 'bg-red-950/80 border-red-500/25 text-red-200' : ''}
                ${t.type === 'warning' ? 'bg-amber-950/80 border-amber-500/25 text-amber-200' : ''}
                ${t.type === 'info' ? 'bg-[#111114]/90 border-white/10 text-[#e8e8ed]' : ''}
              `}
            >
              <span className="text-base leading-none mt-0.5">
                {t.type === 'success' && '✓'}
                {t.type === 'error' && '✕'}
                {t.type === 'warning' && '⚠'}
                {t.type === 'info' && 'ℹ'}
              </span>
              <p className="text-sm leading-snug">{t.message}</p>
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
  return ctx
}
