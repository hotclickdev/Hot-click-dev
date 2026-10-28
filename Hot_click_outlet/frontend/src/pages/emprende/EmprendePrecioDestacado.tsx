import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { PLAN_EMPRENDEDOR } from './emprendePrecios'
import useCupoEmprende from './useCupoEmprende'
import { formatUSD } from '@/utils/format'

/** Banner de precio grande — «Sin mensualidad» solo si el backend confirma cupo gratis; si no, US$/mes desde config. */
export default function EmprendePrecioDestacado() {
  const { t } = useTranslation()
  const { cupo } = useCupoEmprende()
  const usd = cupo?.mensualidadUsdSinCupo
  const mensualidad = cupo != null && cupo.cuposGratisDisponibles > 0
    ? t('emprende.precioMensualidad')
    : usd != null && usd > 0
      ? t('emprende.precioMensualidadUsd', { monto: formatUSD(usd) })
      : t('emprende.precioMensualidadDolares')

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
        {mensualidad}
      </p>
      <p className="text-[15px] mt-2 text-white/90">
        {t('emprende.precioComision', { comision: PLAN_EMPRENDEDOR.comisionPct })}
      </p>
    </motion.div>
  )
}
