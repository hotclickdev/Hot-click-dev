import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import api from '@/services/api'

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

export default function PromoWelcomePopup() {
  const [visible, setVisible]   = useState(false)
  const [email, setEmail]       = useState('')
  const [status, setStatus]     = useState('idle') // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!shouldShow()) return
    const t = setTimeout(() => setVisible(true), DELAY_MS)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!visible) return
    const handler = (e) => { if (e.key === 'Escape') dismiss() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [visible])

  const dismiss = useCallback(() => {
    setVisible(false)
    markSeen()
  }, [])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    setErrorMsg('')
    try {
      await api.post('/cupones/solicitar', { email: email.trim() })
      setStatus('success')
      markSeen()
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'No se pudo generar el cupón'
      setErrorMsg(typeof msg === 'string' ? msg : 'Ocurrió un error. Intenta de nuevo.')
      setStatus('error')
    }
  }, [email])

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="promo-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
            onClick={dismiss}
          />

          {/* Modal */}
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
              {/* Header decorativo */}
              <div className="relative h-32 flex items-center justify-center overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #1a1060 0%, #0d0d1a 60%, #1a0a2e 100%)' }}>
                <div className="absolute w-40 h-40 rounded-full opacity-30 blur-3xl"
                  style={{ background: '#4f7cff', top: '-20px', left: '-20px' }} />
                <div className="absolute w-32 h-32 rounded-full opacity-20 blur-3xl"
                  style={{ background: '#8c5cf6', bottom: '-10px', right: '-10px' }} />

                <div className="relative text-center">
                  <div className="text-3xl font-black text-white tracking-tight">17% OFF</div>
                  <div className="text-xs font-semibold text-[#4f7cff] tracking-widest uppercase mt-0.5">en tu primera compra</div>
                </div>

                <button
                  onClick={dismiss}
                  className="absolute top-3 right-3 p-1.5 rounded-lg transition-colors hover:bg-white/10"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                  aria-label="Cerrar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="px-6 pt-5 pb-6">
                <AnimatePresence mode="wait">

                  {/* Estado: formulario */}
                  {(status === 'idle' || status === 'loading' || status === 'error') && (
                    <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <h3 id="promo-title" className="text-base font-bold mb-1" style={{ color: 'var(--hc-text)' }}>
                        ¡Bienvenido a HOTCLICK!
                      </h3>
                      <p className="text-sm mb-4" style={{ color: 'var(--hc-muted)' }}>
                        Ingresá tu correo y te enviamos un código de descuento único e intransferible.
                      </p>

                      <form onSubmit={handleSubmit} className="space-y-3">
                        <div>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setStatus('idle'); setErrorMsg('') }}
                            placeholder="tu@correo.com"
                            required
                            disabled={status === 'loading'}
                            className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                            style={{
                              background: 'var(--hc-bg)',
                              border: `1.5px solid ${errorMsg ? '#f87171' : 'var(--hc-border)'}`,
                              color: 'var(--hc-text)',
                            }}
                            onFocus={(e) => { e.target.style.borderColor = '#4f7cff'; e.target.style.boxShadow = '0 0 0 3px rgba(79,124,255,0.12)' }}
                            onBlur={(e) => { e.target.style.boxShadow = '' }}
                          />
                          {errorMsg && (
                            <p className="text-xs text-red-400 mt-1">{errorMsg}</p>
                          )}
                        </div>

                        <motion.button
                          type="submit"
                          disabled={status === 'loading' || !email.trim()}
                          whileTap={{ scale: 0.97 }}
                          className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ background: '#4f7cff', boxShadow: '0 0 20px rgba(79,124,255,0.3)' }}
                        >
                          {status === 'loading' ? (
                            <span className="flex items-center justify-center gap-2">
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                              </svg>
                              Enviando...
                            </span>
                          ) : 'Recibir mi cupón'}
                        </motion.button>
                      </form>

                      <button
                        onClick={dismiss}
                        className="w-full mt-2 py-2 rounded-xl text-xs transition-colors hover:bg-white/5"
                        style={{ color: 'var(--hc-muted)' }}
                      >
                        No gracias
                      </button>
                    </motion.div>
                  )}

                  {/* Estado: éxito */}
                  {status === 'success' && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-2 space-y-4"
                    >
                      <div className="flex justify-center">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                          style={{ background: 'rgba(16,185,129,0.12)', border: '1.5px solid rgba(16,185,129,0.3)' }}>
                          <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold text-base mb-1" style={{ color: 'var(--hc-text)' }}>
                          ¡Revisá tu correo!
                        </h3>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
                          Te enviamos tu código de <strong style={{ color: 'var(--hc-text)' }}>17% OFF</strong>. Ingresalo en el checkout al hacer tu primera compra.
                        </p>
                      </div>
                      <motion.button
                        onClick={() => { dismiss(); navigate('/productos') }}
                        whileTap={{ scale: 0.97 }}
                        className="w-full py-3 rounded-xl font-semibold text-sm text-white"
                        style={{ background: '#4f7cff', boxShadow: '0 0 20px rgba(79,124,255,0.3)' }}
                      >
                        Ver productos →
                      </motion.button>
                    </motion.div>
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
