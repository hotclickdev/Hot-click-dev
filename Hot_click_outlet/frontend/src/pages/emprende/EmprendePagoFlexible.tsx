import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'framer-motion'
import TrustGlyph from '@/components/ui/TrustGlyph'

/** Composición de pago: mockup de teléfono con "pago aprobado" + chips flotantes. */
export default function EmprendePagoFlexible() {
  const { t } = useTranslation()
  const reducirMovimiento = useReducedMotion()

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      <h2 className="text-2xl sm:text-3xl font-bold text-center max-w-lg" style={{ color: 'var(--hc-text)' }}>
        {t('emprende.pagoFlexibleTitle')}
      </h2>
      <p className="text-[15px] text-center max-w-lg -mt-4" style={{ color: 'var(--hc-muted)' }}>
        {t('emprende.pagoFlexibleSub')}
      </p>

      <div className="relative flex items-center justify-center gap-4 sm:gap-8 py-6 w-full max-w-3xl">
        <motion.div
          initial={{ opacity: 0, x: -20, rotate: -6 }}
          whileInView={{ opacity: 1, x: 0, rotate: -6 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5 }}
          className="hidden sm:block w-32 rounded-xl border overflow-hidden shadow-lg shrink-0"
          style={{ backgroundColor: '#fff', borderColor: 'var(--hc-n-200)' }}
        >
          <div className="h-20" style={{ backgroundColor: '#eadfc9' }} />
          <div className="p-2.5">
            <p className="text-xs font-semibold" style={{ color: '#14171c' }}>{t('emprende.pagoProductoA')}</p>
            <p className="text-[11px]" style={{ color: 'rgba(20,23,28,0.6)', fontFamily: 'var(--hc-font-mono)' }}>₡3.500</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 shrink-0"
        >
          <motion.div
            animate={reducirMovimiento ? undefined : { y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="w-[190px] rounded-[28px] border-[7px] flex flex-col items-center py-6 px-4 shadow-2xl"
            style={{ backgroundColor: '#fffbf5', borderColor: '#14171c' }}
          >
            <span
              className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
              style={{ backgroundColor: 'rgba(231,59,51,0.14)' }}
            >
              <TrustGlyph tipo="check" className="w-6 h-6 text-[var(--hc-primary)]" />
            </span>
            <p className="text-sm font-semibold text-center" style={{ color: '#14171c' }}>{t('emprende.pagoAprobado')}</p>
            <p className="text-sm" style={{ color: 'var(--hc-primary)', fontFamily: 'var(--hc-font-mono)' }}>₡3.500</p>
            <span
              className="mt-2 px-2.5 py-1 rounded-full text-[10px]"
              style={{ backgroundColor: 'var(--hc-n-100)', color: 'rgba(20,23,28,0.6)' }}
            >
              {t('emprende.pagoSinpeVerificado')}
            </span>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20, rotate: 6 }}
          whileInView={{ opacity: 1, x: 0, rotate: 6 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="hidden sm:block w-32 rounded-xl border overflow-hidden shadow-lg shrink-0"
          style={{ backgroundColor: '#fff', borderColor: 'var(--hc-n-200)' }}
        >
          <div className="h-20" style={{ backgroundColor: '#eadfc9' }} />
          <div className="p-2.5">
            <p className="text-xs font-semibold" style={{ color: '#14171c' }}>{t('emprende.pagoProductoB')}</p>
            <p className="text-[11px]" style={{ color: 'rgba(20,23,28,0.6)', fontFamily: 'var(--hc-font-mono)' }}>₡12.000</p>
          </div>
        </motion.div>
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        {['pagoChipTarjeta', 'pagoChipSinpe', 'pagoChipAprobacion'].map((key) => (
          <span
            key={key}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] border shadow-sm"
            style={{ backgroundColor: '#fff', borderColor: 'var(--hc-n-200)', color: '#14171c' }}
          >
            <TrustGlyph tipo="tarjeta" className="w-4 h-4" />
            {t(`emprende.${key}`)}
          </span>
        ))}
      </div>
    </div>
  )
}
