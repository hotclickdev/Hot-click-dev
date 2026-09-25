import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import EmprendeSeccion from '../emprende/EmprendeSeccion'

const PASOS = ['comoEntras1', 'comoEntras2', 'comoEntras3'] as const

/** Stepper de 3 pasos: registrarse → pagar → activar sucursales. */
export default function NegocioPlusComoEntras() {
  const { t } = useTranslation()

  return (
    <EmprendeSeccion title={t('negocioPlus.comoEntrasTitle')}>
      <div className="grid sm:grid-cols-3 gap-6">
        {PASOS.map((key, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="flex flex-col items-start gap-2.5"
          >
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white"
              style={{ backgroundColor: 'var(--hc-blue-600)' }}
            >
              {i + 1}
            </span>
            <p className="text-[15px] font-semibold" style={{ color: 'var(--hc-text)' }}>{t(`negocioPlus.${key}`)}</p>
          </motion.div>
        ))}
      </div>
    </EmprendeSeccion>
  )
}
