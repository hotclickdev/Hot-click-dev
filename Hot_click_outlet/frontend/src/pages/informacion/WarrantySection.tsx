import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

/** Garantía de 40 días y proceso de devolución. */
export default function WarrantySection() {
  const { t } = useTranslation()
  return (
    <section>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#e8e8ed]">{t('informacion.warrantyTitle')}</h2>
        <p className="text-[#8e8e9a] mt-1 text-sm">{t('informacion.warrantySub')}</p>
      </div>

      {/* 40-day warranty banner */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="relative rounded-2xl bg-[#111114] border border-emerald-500/25 p-6 mb-4 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex flex-col items-center justify-center shrink-0">
            <span className="text-2xl font-extrabold text-emerald-400 leading-none">40</span>
            <span className="text-[9px] font-semibold text-emerald-400/70 uppercase tracking-widest leading-none mt-0.5">{t('informacion.days')}</span>
          </div>
          <div>
            <h3 className="font-bold text-[#e8e8ed] text-lg mb-1">{t('informacion.warrantyBannerTitle')}</h3>
            <p className="text-sm text-[#8e8e9a] leading-relaxed">
              {t('informacion.warrantyBannerDesc')}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Return process steps */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { step: '1', title: t('informacion.returnStep1Title'), desc: t('informacion.returnStep1Desc'), color: 'text-[#4f7cff]', bg: 'bg-[#4f7cff]/10', border: 'border-[#4f7cff]/20' },
          { step: '2', title: t('informacion.returnStep2Title'), desc: t('informacion.returnStep2Desc'), color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
          { step: '3', title: t('informacion.returnStep3Title'), desc: t('informacion.returnStep3Desc'), color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
        ].map(({ step, title, desc, color, bg, border }, i) => (
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="p-5 rounded-2xl bg-[#111114] border border-white/8 flex flex-col gap-3"
          >
            <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center ${color} font-bold text-sm shrink-0`}>
              {step}
            </div>
            <h3 className="font-semibold text-[#e8e8ed] text-sm">{title}</h3>
            <p className="text-xs text-[#8e8e9a] leading-relaxed">{desc}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="mt-4 p-4 rounded-xl bg-white/4 border border-white/8 text-xs text-[#8e8e9a] leading-relaxed"
      >
        {t('informacion.warrantyNote')}
      </motion.div>
    </section>
  )
}
