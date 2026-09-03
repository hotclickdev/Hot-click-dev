import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function CartEmptyState() {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center gap-5 text-center"
    >
      <div className="relative w-28 h-28 flex items-center justify-center">
        <div className="absolute inset-0 rounded-3xl" style={{ background: 'color-mix(in srgb, var(--hc-accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-accent) 16%, transparent)' }} />
        <div className="absolute inset-0 rounded-3xl blur-2xl opacity-30" style={{ background: 'var(--hc-accent)' }} />
        <svg className="relative w-14 h-14" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24" style={{ color: 'var(--hc-accent)' }}>
          <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M1 1h4l2.68 13.39a2 2 0 001.95 1.61h9.72a2 2 0 001.95-1.61L23 6H6" />
        </svg>
      </div>
      <div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--hc-text)' }}>{t('cart.empty')}</h1>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--hc-muted)' }}>{t('cart.emptySub')}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mt-1">
        <Link
          to="/productos"
          className="hc-btn hc-btn-primary min-h-11"
        >
          {t('cart.explore')}
        </Link>
        <Link
          to="/wishlist"
          className="px-6 py-2.5 rounded-xl border text-sm font-medium transition-all hover:bg-hc-surface-2"
          style={{ color: 'var(--hc-muted)', borderColor: 'var(--hc-border)' }}
        >
          {t('nav.wishlist')}
        </Link>
      </div>
    </motion.div>
  )
}
