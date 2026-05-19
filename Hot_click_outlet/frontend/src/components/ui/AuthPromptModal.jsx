import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useUiStore from '@/store/uiStore'

export default function AuthPromptModal() {
  const { authPromptOpen, setAuthPromptOpen } = useUiStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!authPromptOpen) return
    const handler = (e) => { if (e.key === 'Escape') setAuthPromptOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [authPromptOpen])

  useEffect(() => {
    document.body.style.overflow = authPromptOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [authPromptOpen])

  const go = (path) => {
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
              className="pointer-events-auto w-full max-w-sm rounded-3xl p-7 relative"
              style={{
                background: 'var(--hc-surface)',
                border: '1px solid var(--hc-border)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
              }}
            >
              {/* Close */}
              <button
                onClick={() => setAuthPromptOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-xl transition-colors hover:bg-white/8"
                style={{ color: 'var(--hc-muted)' }}
                aria-label="Cerrar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Icon */}
              <div className="flex justify-center mb-5">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'color-mix(in srgb, #4f7cff 12%, transparent)',
                    border: '1px solid color-mix(in srgb, #4f7cff 24%, transparent)',
                  }}
                >
                  <svg className="w-8 h-8 text-[#4f7cff]" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>

              {/* Copy */}
              <h2 className="text-xl font-bold text-center mb-2" style={{ color: 'var(--hc-text)' }}>
                Crea tu cuenta gratis
              </h2>
              <p className="text-sm text-center leading-relaxed mb-6" style={{ color: 'var(--hc-muted)' }}>
                Para completar tu compra necesitas registrarte o iniciar sesión. Es rápido y sin costo.
              </p>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => go('/registro')}
                  className="w-full h-12 rounded-2xl bg-[#4f7cff] hover:bg-[#3d6ee0] text-white font-bold text-sm transition-all shadow-[0_0_20px_rgba(79,124,255,0.3)] hover:shadow-[0_0_32px_rgba(79,124,255,0.5)]"
                >
                  Crear cuenta
                </button>
                <button
                  onClick={() => go('/login')}
                  className="w-full h-12 rounded-2xl border text-sm font-semibold transition-all hover:bg-white/5"
                  style={{ color: 'var(--hc-text)', borderColor: 'var(--hc-border)' }}
                >
                  Ya tengo cuenta — Iniciar sesión
                </button>
              </div>

              <p className="text-[11px] text-center mt-4" style={{ color: 'var(--hc-muted)' }}>
                También podés pedir por WhatsApp sin registrarte
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
