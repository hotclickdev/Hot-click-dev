import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

/** Banner CTA de campaña sobre azul 900. */
export default function HomeCta() {
  const { t } = useTranslation()
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="rounded-3xl overflow-hidden p-7 sm:p-12"
        style={{ background: 'var(--hc-blue-900)' }}
      >
        <p className="text-[11px] font-bold tracking-[0.14em] uppercase mb-3" style={{ color: 'var(--hc-blue-300)', fontFamily: 'var(--font-mono)' }}>
          HotClick · Costa Rica
        </p>
        <h2
          className="text-3xl sm:text-4xl mb-4"
          style={{ color: '#FFFFFF', fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '-0.02em' }}
        >
          {t('home.ctaTitle')}
        </h2>
        <p className="mb-6 sm:mb-8 max-w-md mx-auto" style={{ color: 'var(--hc-blue-200)' }}>
          {t('home.ctaSub')}
        </p>
        <Link to="/productos" className="hc-btn hc-btn-primary hc-btn-lg inline-flex">
          {t('home.ctaBtn')}
        </Link>
      </motion.div>
    </section>
  )
}
