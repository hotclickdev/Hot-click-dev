import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import useUiStore from '@/store/uiStore'
import useCartStore from '@/store/cartStore'
import CloseIcon from '@/components/ui/CloseIcon'

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export default function AuthPromptModal() {
  const { t } = useTranslation()
  const { authPromptOpen, setAuthPromptOpen } = useUiStore()
  const toWhatsAppMessage = useCartStore((s) => s.toWhatsAppMessage)
  const navigate = useNavigate()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!authPromptOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setAuthPromptOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [authPromptOpen, setAuthPromptOpen])

  useEffect(() => {
    document.body.style.overflow = authPromptOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [authPromptOpen])

  useEffect(() => {
    if (!authPromptOpen) return
    const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)
    first?.focus()
  }, [authPromptOpen])

  const go = (path: string) => {
    setAuthPromptOpen(false)
    navigate(path)
  }

  return (
    <AnimatePresence>
      {authPromptOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="auth-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={() => setAuthPromptOpen(false)}
          />

          {/* Modal */}
          <motion.div
            key="auth-modal"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="fixed z-[61] inset-0 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="auth-prompt-title"
              className="pointer-events-auto w-full max-w-sm rounded-3xl p-7 relative"
              style={{
                background: 'var(--hc-surface)',
                border: '1px solid var(--hc-border)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
              }}
            >
              {/* Close */}
              <button type="button"
                onClick={() => setAuthPromptOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-xl transition-colors hover:bg-white/8"
                style={{ color: 'var(--hc-muted)' }}
                aria-label={t('authPrompt.close')}
              >
                <CloseIcon className="w-4 h-4" />
              </button>

              {/* Icon */}
              <div className="flex justify-center mb-5">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--hc-accent) 24%, transparent)',
                  }}
                >
                  <svg className="w-8 h-8" style={{ color: 'var(--hc-accent)' }} fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>

              {/* Copy */}
              <h2 id="auth-prompt-title" className="text-xl font-bold text-center mb-2" style={{ color: 'var(--hc-text)' }}>
                {t('authPrompt.title')}
              </h2>
              <p className="text-sm text-center leading-relaxed mb-6" style={{ color: 'var(--hc-muted)' }}>
                {t('authPrompt.subtitle')}
              </p>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button type="button"
                  onClick={() => go('/checkout')}
                  className="hc-btn hc-btn-primary w-full h-12 rounded-2xl text-sm font-bold"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  {t('authPrompt.guestCheckout')}
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px" style={{ background: 'var(--hc-border)' }} />
                  <span className="text-[11px]" style={{ color: 'var(--hc-muted)' }}>o</span>
                  <div className="flex-1 h-px" style={{ background: 'var(--hc-border)' }} />
                </div>

                <button type="button"
                  onClick={() => go('/registro')}
                  className="hc-btn hc-btn-outline w-full h-12 rounded-2xl text-sm font-semibold"
                >
                  {t('authPrompt.createAccount')}
                </button>
                <button type="button"
                  onClick={() => go('/login')}
                  className="text-xs text-center transition-colors hover:underline"
                  style={{ color: 'var(--hc-muted)' }}
                >
                  {t('authPrompt.hasAccount')}
                </button>

                <button type="button"
                  onClick={() => {
                    setAuthPromptOpen(false)
                    globalThis.open(`https://wa.me/50686667888?text=${toWhatsAppMessage()}`, '_blank')
                  }}
                  className="w-full min-h-11 inline-flex items-center justify-center gap-2 text-sm font-medium"
                  style={{ color: 'var(--hc-muted)' }}
                >
                  <WhatsAppIcon />
                  {t('authPrompt.whatsapp')}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function WhatsAppIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}
