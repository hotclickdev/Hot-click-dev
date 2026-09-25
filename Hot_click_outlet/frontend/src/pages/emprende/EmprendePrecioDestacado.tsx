import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { PLAN_EMPRENDEDOR } from './emprendePrecios'

/** Banner de precio grande — refuerza el mensaje "sin mensualidad". */
export default function EmprendePrecioDestacado() {
  const { t } = useTranslation()

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.4 }}
      className="rounded-[20px] px-8 py-9 sm:px-14 sm:py-10 text-center"
      style={{ backgroundColor: 'var(--hc-primary)' }}
    >
      <p className="text-4xl sm:text-5xl font-bold text-white" style={{ fontFamily: 'var(--hc-font-display)' }}>
        {t('emprende.precioMensualidad')}
      </p>
      <p className="text-[15px] mt-2 text-white/90">
        {t('emprende.precioComision', { comision: PLAN_EMPRENDEDOR.comisionPct, minimo: PLAN_EMPRENDEDOR.minimoColones })}
      </p>
    </motion.div>
  )
}
