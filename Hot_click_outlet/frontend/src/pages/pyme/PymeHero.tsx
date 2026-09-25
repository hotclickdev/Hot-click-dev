import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { PLAN_LANDING_COPY } from '../planes/planLandingCopy'
import PymeHeroPanel from './PymeHeroPanel'

const copy = PLAN_LANDING_COPY.pyme

/** Hero de /para-pymes: propuesta + precio + panel preview flotante. */
export default function PymeHero() {
  const { t } = useTranslation()

  return (
    <header className="relative overflow-hidden rounded-3xl">
      <div
        className="pointer-events-none absolute -top-40 -right-32 w-[420px] h-[420px] rounded-full opacity-40 blur-2xl"
        style={{ background: 'radial-gradient(circle, var(--hc-primary) 0%, transparent 70%)' }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-48 -left-40 w-[460px] h-[460px] rounded-full opacity-25 blur-2xl"
        style={{ background: 'radial-gradient(circle, var(--hc-blue-600, #005cb2) 0%, transparent 70%)' }}
        aria-hidden
      />
      <div className="relative flex flex-col lg:flex-row gap-10 lg:gap-12 items-center py-8 sm:py-10">
        <div className="flex-1 flex flex-col items-start gap-4 min-w-0">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs sm:text-[13px] font-semibold"
            style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}
          >
            {t('pyme.heroBadge')}
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-3xl sm:text-4xl lg:text-[46px] font-bold leading-[1.1]"
            style={{ color: 'var(--hc-text)', fontFamily: 'var(--hc-font-display)' }}
          >
            {copy.headline}.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-base sm:text-lg leading-relaxed max-w-xl"
            style={{ color: 'var(--hc-text)', fontFamily: 'var(--hc-font-mono)' }}
          >
            {copy.subheadline}
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-sm sm:text-base"
            style={{ color: 'var(--hc-primary)', fontFamily: 'var(--hc-font-mono)' }}
          >
            {copy.precio}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link
              to="/registro-empresa?plan=pyme"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-full text-sm sm:text-base font-semibold min-h-[44px] transition-transform hover:scale-[1.03] active:scale-[0.98]"
              style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}
            >
              {copy.ctaLabel}
            </Link>
          </motion.div>
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
            <Link to="/para-emprendedores" style={{ color: 'var(--hc-text)' }}>
              {t('pyme.heroSecondary')}
            </Link>
          </p>
        </div>

        <div className="flex-1 w-full flex justify-center lg:justify-end min-w-0">
          <PymeHeroPanel />
        </div>
      </div>
    </header>
  )
}
