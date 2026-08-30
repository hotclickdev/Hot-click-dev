import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '@/services/api'
import PromoWelcomeForm, { type PromoWelcomeStatus } from '@/components/ui/promoWelcome/PromoWelcomeForm'
import PromoWelcomeSuccess from '@/components/ui/promoWelcome/PromoWelcomeSuccess'
import CloseIcon from '@/components/ui/CloseIcon'

const LS_KEY = 'hc-promo-seen'
const COOLDOWN_DAYS = 7
const DELAY_MS = 2500

function shouldShow() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return true
    return (Date.now() - Number(raw)) / (1000 * 60 * 60 * 24) >= COOLDOWN_DAYS
  } catch { return true }
}

function markSeen() {
  try { localStorage.setItem(LS_KEY, String(Date.now())) } catch { /* noop */ }
}

function mensajeCupon(err: unknown): string {
  if (!err || typeof err !== 'object' || !('response' in err)) {
    return 'No se pudo generar el cupón'
  }
  const data = (err as { response?: { data?: { message?: unknown } | unknown } }).response?.data
  const desdeObjeto = data && typeof data === 'object' && 'message' in data
    ? (data as { message?: unknown }).message
    : undefined
  const msg = desdeObjeto || data || 'No se pudo generar el cupón'
  return typeof msg === 'string' ? msg : 'Ocurrió un error. Intenta de nuevo.'
}

export default function PromoWelcomePopup() {
  const { t } = useTranslation()
  const [visible, setVisible]   = useState(false)
  const [email, setEmail]       = useState('')
  const [status, setStatus]     = useState<PromoWelcomeStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!shouldShow()) return
    const t = setTimeout(() => setVisible(true), DELAY_MS)
    return () => clearTimeout(t)
  }, [])

  const dismiss = useCallback(() => {
    setVisible(false)
    markSeen()
  }, [])

  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [visible])

  const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    setErrorMsg('')
    try {
      await api.post('/cupones/solicitar', { email: email.trim() })
      setStatus('success')
      markSeen()
    } catch (err: unknown) {
      setErrorMsg(mensajeCupon(err))
      setStatus('error')
    }
  }, [email])

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            key="promo-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
            onClick={dismiss}
          />

          <motion.div
            key="promo-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="promo-title"
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="fixed z-[81] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-sm"
          >
            <div
              className="rounded-3xl overflow-hidden relative"
              style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', boxShadow: '0 40px 100px rgba(0,0,0,0.65)' }}
            >
              <div className="relative h-32 flex items-center justify-center overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #1a1060 0%, #0d0d1a 60%, #1a0a2e 100%)' }}>
                <div className="absolute w-40 h-40 rounded-full opacity-30 blur-3xl"
                  style={{ background: 'var(--hc-accent)', top: '-20px', left: '-20px' }} />
                <div className="absolute w-32 h-32 rounded-full opacity-20 blur-3xl"
                  style={{ background: '#8c5cf6', bottom: '-10px', right: '-10px' }} />

                <div className="relative text-center">
                  <div className="text-3xl font-black text-white tracking-tight">13% OFF</div>
                  <div className="text-xs font-semibold text-[#4f7cff] tracking-widest uppercase mt-0.5">{t('promo.firstPurchase')}</div>
                </div>

                <button type="button"
                  onClick={dismiss}
                  className="absolute top-3 right-3 p-1.5 rounded-lg transition-colors hover:bg-white/10"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                  aria-label="Cerrar"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 pt-5 pb-6">
                <AnimatePresence mode="wait">

                  {(status === 'idle' || status === 'loading' || status === 'error') && (
                    <PromoWelcomeForm
                      email={email}
                      setEmail={setEmail}
                      status={status}
                      errorMsg={errorMsg}
                      setStatus={setStatus}
                      setErrorMsg={setErrorMsg}
                      handleSubmit={handleSubmit}
                      dismiss={dismiss}
                    />
                  )}

                  {status === 'success' && (
                    <PromoWelcomeSuccess dismiss={dismiss} navigate={navigate} />
                  )}

                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
