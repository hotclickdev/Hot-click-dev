import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { PLAN_EMPRENDEDOR } from './emprendePrecios'
import useCupoEmprende from './useCupoEmprende'
import { formatoMontoPlan } from '@/config/planesPrecios'

/** Banner de precio grande — «Sin mensualidad» solo si el backend confirma cupo gratis; si no, US$/mes desde config. */
export default function EmprendePrecioDestacado() {
  const { t } = useTranslation()
  const { cupo } = useCupoEmprende()
  const monto = cupo?.mensualidadUsdSinCupo
  const moneda = cupo?.moneda?.trim().toUpperCase()
  // Monto + moneda del backend («₡12.900/mes» o «US$24/mes»); sin monto, etiqueta según la moneda (neutra si no se conoce).
  const montoTexto = monto != null && monto > 0 ? formatoMontoPlan(monto, moneda) : null
  const sinMonto = moneda === 'CRC' ? t('emprende.precioMensualidadColones')
    : moneda === 'USD' ? t('emprende.precioMensualidadDolares') : t('emprende.precioMensualidadNeutra')
  const mensualidad = cupo != null && cupo.cuposGratisDisponibles > 0
    ? t('emprende.precioMensualidad')
    : montoTexto ? t('emprende.precioMensualidadUsd', { monto: montoTexto }) : sinMonto

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
