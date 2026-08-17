import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ApplePayIcon, GooglePayIcon, WhatsAppIcon } from './checkoutIcons'

export default function ExpressCheckout({ onWhatsApp }) {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 space-y-3"
      style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
    >
      <h2 className="font-semibold text-sm" style={{ color: 'var(--hc-text)' }}>{t('checkout.expressPayment')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* WhatsApp — functional */}
        <button
          onClick={onWhatsApp}
          className="flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium transition-all bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/18 hover:border-emerald-500/40"
        >
          <WhatsAppIcon />
          WhatsApp
        </button>

        {/* Apple Pay — placeholder */}
        <div className="relative flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium border cursor-not-allowed opacity-40"
          style={{ borderColor: 'var(--hc-border)', color: 'var(--hc-muted)' }}
          title={t('checkout.comingSoon')}
        >
          <ApplePayIcon />
          Apple Pay
          <span className="absolute -top-2 -right-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#4f7cff]/20 text-[#4f7cff] border border-[#4f7cff]/30">
            {t('checkout.comingSoon')}
          </span>
        </div>

        {/* Google Pay — placeholder */}
        <div className="relative flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium border cursor-not-allowed opacity-40"
          style={{ borderColor: 'var(--hc-border)', color: 'var(--hc-muted)' }}
          title={t('checkout.comingSoon')}
        >
          <GooglePayIcon />
          Google Pay
          <span className="absolute -top-2 -right-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#4f7cff]/20 text-[#4f7cff] border border-[#4f7cff]/30">
            {t('checkout.comingSoon')}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: 'var(--hc-border)' }} />
        <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>{t('checkout.orPayWith')}</span>
        <div className="flex-1 h-px" style={{ background: 'var(--hc-border)' }} />
      </div>
    </motion.div>
  )
}
