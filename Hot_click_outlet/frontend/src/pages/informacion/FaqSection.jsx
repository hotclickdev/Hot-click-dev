import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ChevronIcon } from './informacionIcons'

/** Preguntas frecuentes. */
export default function FaqSection() {
  const [openFaq, setOpenFaq] = useState(null)
  const { t } = useTranslation()

  const FAQS = [
    { q: t('informacion.faq1q'), a: t('informacion.faq1a') },
    { q: t('informacion.faq2q'), a: t('informacion.faq2a') },
    { q: t('informacion.faq3q'), a: t('informacion.faq3a') },
    { q: t('informacion.faq4q'), a: t('informacion.faq4a') },
    { q: t('informacion.faq5q'), a: t('informacion.faq5a') },
    { q: t('informacion.faq6q'), a: t('informacion.faq6a') },
    { q: t('informacion.faq7q'), a: t('informacion.faq7a') },
    { q: t('informacion.faq8q'), a: t('informacion.faq8a') },
    { q: t('informacion.faq9q'), a: t('informacion.faq9a') },
  ]

  return (
    <section>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#e8e8ed]">{t('informacion.faqTitle')}</h2>
        <p className="text-[#8e8e9a] mt-1 text-sm">{t('informacion.faqSub')}</p>
      </div>
      <div className="space-y-2">
        {FAQS.map((faq, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden"
          >
            <button type="button"
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              aria-expanded={openFaq === i}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="font-medium text-[#e8e8ed] text-sm">{faq.q}</span>
              <ChevronIcon open={openFaq === i} />
            </button>
            <AnimatePresence>
              {openFaq === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-4 text-sm text-[#8e8e9a] leading-relaxed border-t border-white/6 pt-3">
                    {faq.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
