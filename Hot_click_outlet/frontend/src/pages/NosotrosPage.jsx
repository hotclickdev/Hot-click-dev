import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, delay },
})

export default function NosotrosPage() {
  const { t } = useTranslation()

  const values = [
    { icon: '💡', titleKey: 'nosotros.val1Title', descKey: 'nosotros.val1Desc' },
    { icon: '👂', titleKey: 'nosotros.val2Title', descKey: 'nosotros.val2Desc' },
    { icon: '🔒', titleKey: 'nosotros.val3Title', descKey: 'nosotros.val3Desc' },
  ]

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-16">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-[#e8e8ed] mb-4">
            {t('nosotros.title')}
          </h1>
          <p className="text-lg text-[#8e8e9a] max-w-2xl mx-auto leading-relaxed">
            {t('nosotros.subtitle')}
          </p>
        </motion.div>

        {/* Founder */}
        <motion.div {...fadeUp(0.1)} className="flex flex-col sm:flex-row items-center gap-8 bg-[#111114] border border-white/8 rounded-3xl p-8">
          <div className="shrink-0">
            <img
              src="/fundador.jpg"
              alt="Fundador de HOTCLICK"
              className="w-36 h-36 rounded-2xl object-cover ring-2 ring-[#4f7cff]/40 shadow-[0_0_24px_rgba(79,124,255,0.2)]"
            />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-xs font-semibold text-[#4f7cff] uppercase tracking-widest mb-1">
              {t('nosotros.founderLabel')}
            </p>
            <h2 className="text-2xl font-bold text-[#e8e8ed] mb-3">
              {t('nosotros.founderTitle')}
            </h2>
            <p className="text-sm text-[#8e8e9a] leading-relaxed">
              {t('nosotros.founderBio1')}{' '}
              <span className="text-[#e8e8ed] font-medium">{t('nosotros.founderBio1Bold')}</span>.{' '}
              {t('nosotros.founderBio1End')}
            </p>
            <p className="text-sm text-[#8e8e9a] leading-relaxed mt-3">
              {t('nosotros.founderBio2')}{' '}
              <span className="text-[#e8e8ed] font-medium">{t('nosotros.founderBio2Bold')}</span>{' '}
              {t('nosotros.founderBio2End')}
            </p>
          </div>
        </motion.div>

        {/* Values */}
        <motion.div {...fadeUp(0.15)}>
          <h2 className="text-2xl font-bold text-[#e8e8ed] mb-6 text-center">{t('nosotros.values')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {values.map(({ icon, titleKey, descKey }, i) => (
              <motion.div
                key={titleKey}
                {...fadeUp(0.1 * i)}
                className="text-center p-6 rounded-2xl bg-[#111114] border border-white/8 hover:border-[#4f7cff]/30 transition-colors"
              >
                <span className="text-3xl block mb-3">{icon}</span>
                <h3 className="font-semibold text-[#e8e8ed] mb-2">{t(titleKey)}</h3>
                <p className="text-xs text-[#8e8e9a] leading-relaxed">{t(descKey)}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Shipping */}
        <motion.div {...fadeUp(0.1)} className="bg-gradient-to-br from-[#4f7cff]/8 to-purple-500/5 border border-white/8 rounded-3xl p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#4f7cff]/10 mb-3">
              <svg className="w-6 h-6 text-[#4f7cff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 8h14M5 8a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v2M5 8l1 9a2 2 0 002 2h8a2 2 0 002-2l1-9" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#e8e8ed] mb-2">{t('nosotros.shippingTitle')}</h2>
            <p className="text-sm text-[#8e8e9a] max-w-lg mx-auto">
              {t('nosotros.shippingDesc')}{' '}
              <span className="text-[#e8e8ed] font-medium">{t('nosotros.shippingDescBold')}</span>
              {t('nosotros.shippingDescEnd')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <div className="flex items-center gap-3 bg-[#111114] border border-white/8 rounded-xl px-5 py-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[#8e8e9a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-[#e8e8ed]">{t('nosotros.correosCR')}</p>
                <p className="text-xs text-[#8e8e9a]">{t('nosotros.correosCRSub')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-[#111114] border border-white/8 rounded-xl px-5 py-3">
              <div className="w-8 h-8 rounded-lg bg-[#4f7cff]/10 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[#4f7cff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-[#e8e8ed]">{t('nosotros.uberFlash')}</p>
                <p className="text-xs text-[#8e8e9a]">{t('nosotros.uberFlashSub')}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div {...fadeUp(0.1)} className="text-center">
          <p className="text-[#8e8e9a] text-sm mb-4">
            {t('nosotros.ctaSub')}
          </p>
          <a
            href="/contacto"
            className="inline-block px-6 py-2.5 rounded-xl bg-[#4f7cff] hover:bg-[#3d6ee0] text-white text-sm font-medium transition-all duration-200 shadow-[0_0_16px_rgba(79,124,255,0.25)] hover:shadow-[0_0_24px_rgba(79,124,255,0.4)]"
          >
            {t('nosotros.ctaBtn')}
          </a>
        </motion.div>

      </div>
    </MainLayout>
  )
}
