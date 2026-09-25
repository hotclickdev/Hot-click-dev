import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

const PASOS = ['comoEntras1', 'comoEntras2', 'comoEntras3'] as const

/** Stepper de 3 pasos: registro → pago de mensualidad → panel activo. */
export default function PymeComoEntras() {
  const { t } = useTranslation()

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold mb-6" style={{ color: 'var(--hc-text)' }}>
        {t('pyme.comoEntrasTitle')}
      </h2>
      <div className="grid sm:grid-cols-3 gap-6">
        {PASOS.map((key, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="flex flex-col gap-2.5"
          >
            <span
              className="w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center font-bold text-base"
              style={{ borderColor: 'var(--hc-primary)', color: 'var(--hc-primary)' }}
            >
              {i + 1}
            </span>
            <p className="text-[15px] font-semibold" style={{ color: 'var(--hc-text)' }}>{t(`pyme.${key}Titulo`)}</p>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--hc-muted)' }}>{t(`pyme.${key}Desc`)}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
