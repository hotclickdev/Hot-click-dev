import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'

const STORAGE_KEY = 'hotclick-cookie-consent'

export function getCookieConsent() {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : null
}

export function useCookieConsent() {
  return getCookieConsent()
}

export function setCookieConsent(value) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

export default function CookieBanner({ onConsent }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return
    const t = setTimeout(() => setVisible(true), 12000)
    return () => clearTimeout(t)
  }, [])

  const accept = (analytics) => {
    document.activeElement?.blur()
    const consent = { analytics, functional: true, timestamp: Date.now() }
    setCookieConsent(consent)
    setVisible(false)
    onConsent?.(consent)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-[9999] p-3 sm:p-4 pointer-events-none"
        >
          <div
            className="max-w-3xl mx-auto rounded-2xl px-5 py-4 pointer-events-auto flex flex-col sm:flex-row items-start sm:items-center gap-4"
            style={{
              background: 'color-mix(in srgb, var(--hc-surface) 97%, transparent)',
              border: '1px solid var(--hc-border)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 -4px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04)',
            }}
          >
            {/* Icon */}
            <div
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center hidden sm:flex"
              style={{ background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-accent) 22%, transparent)' }}
            >
              <svg className="w-4.5 h-4.5 text-[#4f7cff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                <circle cx="8.5" cy="10" r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="15" cy="8" r="1" fill="currentColor" stroke="none"/>
                <circle cx="15.5" cy="14.5" r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="10" cy="15.5" r="1" fill="currentColor" stroke="none"/>
              </svg>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--hc-text)' }}>
                Usamos cookies para mejorar tu experiencia
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
                Las cookies esenciales mantienen tu carrito y sesión. Las de análisis nos ayudan a mejorar la plataforma.{' '}
                <Link to="/informacion" className="underline underline-offset-2 hover:opacity-80 transition-opacity" style={{ color: 'var(--hc-accent)' }}>
                  Más información
                </Link>
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 shrink-0 w-full sm:w-auto">
              <button
                onClick={() => accept(false)}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:bg-white/8"
                style={{ color: 'var(--hc-muted)', border: '1px solid var(--hc-border)' }}
              >
                Solo esenciales
              </button>
              <button
                onClick={() => accept(true)}
                className="flex-1 sm:flex-none px-5 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                style={{
                  background: 'var(--hc-accent)',
                  boxShadow: '0 0 16px color-mix(in srgb, var(--hc-accent) 40%, transparent)',
                }}
              >
                Aceptar todo
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
