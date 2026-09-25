import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import TrustGlyph from '@/components/ui/TrustGlyph'
import { PLAN_LANDING_COPY } from '../planes/planLandingCopy'

const copy = PLAN_LANDING_COPY.plus
const [mensual, comision] = copy.precio.split(' + ')

const PERKS = ['precioDestacadoPerk1', 'precioDestacadoPerk2', 'precioDestacadoPerk3'] as const

/** Banner de precio grande con los 3 perks clave del plan. */
export default function NegocioPlusPrecioDestacado() {
  const { t } = useTranslation()

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col sm:flex-row items-center justify-between gap-8 rounded-[20px] px-8 py-9 sm:px-12 sm:py-10"
      style={{ backgroundColor: '#0e1b33' }}
    >
      <div className="text-center sm:text-left">
        <p className="text-4xl sm:text-5xl font-bold text-white" style={{ fontFamily: 'var(--hc-font-display)' }}>
          {mensual}
        </p>
        <p className="text-[15px] mt-1 text-white/70">{comision ? `+ ${comision}` : null}</p>
      </div>
      <ul className="flex flex-col gap-3">
        {PERKS.map((key) => (
          <li key={key} className="flex items-center gap-2.5 text-sm text-white/90">
            <TrustGlyph tipo="check" className="w-4 h-4 shrink-0" />
            {t(`negocioPlus.${key}`)}
          </li>
        ))}
      </ul>
    </motion.div>
  )
}
