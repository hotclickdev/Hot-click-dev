import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import PilaresLinks from './PilaresLinks'

/** Cierre de home: mismas tres puertas, no solo catálogo. */
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
        <PilaresLinks tono="oscuro" />
      </motion.div>
    </section>
  )
}
