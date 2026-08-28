import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

export type PromoWelcomeStatus = 'idle' | 'loading' | 'success' | 'error'

type PromoWelcomeFormProps = {
  email: string
  setEmail: Dispatch<SetStateAction<string>>
  status: PromoWelcomeStatus
  errorMsg: string
  setStatus: Dispatch<SetStateAction<PromoWelcomeStatus>>
  setErrorMsg: Dispatch<SetStateAction<string>>
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void
  dismiss: () => void
}

export default function PromoWelcomeForm({
  email,
  setEmail,
  status,
  errorMsg,
  setStatus,
  setErrorMsg,
  handleSubmit,
  dismiss,
}: PromoWelcomeFormProps) {
  const { t } = useTranslation()

  return (
    <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <h3 id="promo-title" className="text-base font-bold mb-1" style={{ color: 'var(--hc-text)' }}>
        {t('promo.title')}
      </h3>
      <p className="text-sm mb-4" style={{ color: 'var(--hc-muted)' }}>
        {t('promo.subtitle')}
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setStatus('idle'); setErrorMsg('') }}
            placeholder={t('promo.emailPlaceholder')}
            required
            disabled={status === 'loading'}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
            style={{
              background: 'var(--hc-bg)',
              border: `1.5px solid ${errorMsg ? '#f87171' : 'var(--hc-border)'}`,
              color: 'var(--hc-text)',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--hc-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(23,71,168,0.12)' }}
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
          style={{ background: 'var(--hc-accent)', boxShadow: '0 0 20px rgba(23,71,168,0.3)' }}
        >
          {status === 'loading' ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              {t('promo.sending')}
            </span>
          ) : t('promo.getCoupon')}
        </motion.button>
      </form>

      <button type="button"
        onClick={dismiss}
        className="w-full mt-2 py-2 rounded-xl text-xs transition-colors hover:bg-white/5"
        style={{ color: 'var(--hc-muted)' }}
      >
        {t('promo.noThanks')}
      </button>
    </motion.div>
  )
}
