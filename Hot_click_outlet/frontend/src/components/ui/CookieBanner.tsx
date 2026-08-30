import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { esRutaClaudeclick } from '@/utils/rutaPrototipo'

const STORAGE_KEY = 'hotclick-cookie-consent'

export type CookieConsent = {
  analytics: boolean
  functional: boolean
  timestamp: number
}

export function getCookieConsent(): CookieConsent | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  return parseConsent(raw)
}

export function useCookieConsent() {
  return getCookieConsent()
}

export function setCookieConsent(value: CookieConsent) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

/**
 * Banner de cookies. No se muestra en el prototipo CLAUDECLICK.
 */
export default function CookieBanner({ onConsent }: { onConsent?: (consent: CookieConsent) => void }) {
  const { pathname } = useLocation()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (esRutaClaudeclick(pathname)) return
    if (localStorage.getItem(STORAGE_KEY)) return
    const t = setTimeout(() => setVisible(true), 12000)
    return () => clearTimeout(t)
  }, [pathname])

  function accept(analytics: boolean) {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    const consent: CookieConsent = { analytics, functional: true, timestamp: Date.now() }
    setCookieConsent(consent)
    setVisible(false)
    onConsent?.(consent)
  }

  if (esRutaClaudeclick(pathname)) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="pointer-events-none fixed bottom-0 left-0 right-0 z-[9999] p-3 sm:p-4"
        >
          <CuerpoBanner onSoloEsenciales={() => accept(false)} onAceptarTodo={() => accept(true)} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function parseConsent(raw: string): CookieConsent | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const obj = parsed as { analytics?: unknown; functional?: unknown; timestamp?: unknown }
    if (typeof obj.analytics !== 'boolean') return null
    return {
      analytics: obj.analytics,
      functional: obj.functional === true,
      timestamp: typeof obj.timestamp === 'number' ? obj.timestamp : Date.now(),
    }
  } catch {
    return null
  }
}

function CuerpoBanner({
  onSoloEsenciales,
  onAceptarTodo,
}: {
  onSoloEsenciales: () => void
  onAceptarTodo: () => void
}) {
  const { t } = useTranslation()
  return (
    <div
      className="mx-auto flex max-w-3xl flex-col items-start gap-4 rounded-2xl px-5 py-4 pointer-events-auto sm:flex-row sm:items-center"
      style={{
        background: 'color-mix(in srgb, var(--hc-surface) 97%, transparent)',
        border: '1px solid var(--hc-border)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 -4px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04)',
      }}
    >
      <IconoCookie />
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
          {t('cookies.title')}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
          {t('cookies.body')}{' '}
          <Link to="/informacion" className="underline underline-offset-2 transition-opacity hover:opacity-80" style={{ color: 'var(--hc-accent)' }}>
            {t('cookies.moreInfo')}
          </Link>
        </p>
      </div>
      <div className="flex w-full shrink-0 gap-2 sm:w-auto">
        <button
          type="button"
          onClick={onSoloEsenciales}
          className="flex-1 rounded-xl px-4 py-2 text-xs font-semibold transition-all hover:bg-white/8 sm:flex-none"
          style={{ color: 'var(--hc-muted)', border: '1px solid var(--hc-border)' }}
        >
          {t('cookies.essentialOnly')}
        </button>
        <button
          type="button"
          onClick={onAceptarTodo}
          className="flex-1 rounded-xl px-5 py-2 text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-95 sm:flex-none"
          style={{
            background: 'var(--hc-accent)',
            boxShadow: '0 0 16px color-mix(in srgb, var(--hc-accent) 40%, transparent)',
          }}
        >
          {t('cookies.acceptAll')}
        </button>
      </div>
    </div>
  )
}

function IconoCookie() {
  return (
    <div
      className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:flex"
      style={{ background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-accent) 22%, transparent)' }}
    >
      <svg className="text-[#4f7cff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }} aria-hidden>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
        <circle cx="8.5" cy="10" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="15" cy="8" r="1" fill="currentColor" stroke="none" />
        <circle cx="15.5" cy="14.5" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="10" cy="15.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    </div>
  )
}
