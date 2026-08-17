import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

/** Encabezado de la página de información. */
export default function InformacionHero() {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="text-center"
    >
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#4f7cff]/10 border border-[#4f7cff]/20 text-sm text-[#4f7cff] mb-5">
        {t('informacion.title')}
      </div>
      <h1 className="text-4xl font-bold text-[#e8e8ed] mb-4">{t('informacion.hero')}</h1>
      <p className="text-[#8e8e9a] text-lg max-w-xl mx-auto">
        {t('informacion.heroSub')}
      </p>
    </motion.div>
  )
}
