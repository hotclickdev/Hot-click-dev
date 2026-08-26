import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import TextoFlecha from '@/components/ui/TextoFlecha'

export default function PromoWelcomeSuccess({ dismiss, navigate }) {
  const { t } = useTranslation()

  return (
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
          {t('promo.successTitle')}
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
          {t('promo.successSub')}
        </p>
      </div>
      <motion.button
        onClick={() => { dismiss(); navigate('/productos') }}
        whileTap={{ scale: 0.97 }}
        className="w-full py-3 rounded-xl font-semibold text-sm text-white"
        style={{ background: 'var(--hc-accent)', boxShadow: '0 0 20px rgba(23,71,168,0.3)' }}
      >
        <TextoFlecha>{t('promo.viewProducts')}</TextoFlecha>
      </motion.button>
    </motion.div>
  )
}
