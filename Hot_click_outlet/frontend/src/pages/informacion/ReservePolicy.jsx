import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ClockIcon } from './informacionIcons'
import TrustGlyph from '@/components/ui/TrustGlyph'

/** Política de reserva de 1 hora. */
export default function ReservePolicy() {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="relative rounded-2xl bg-[#111114] border border-amber-500/25 p-6 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent pointer-events-none" />
      <div className="relative flex flex-col sm:flex-row items-start gap-5">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex flex-col items-center justify-center shrink-0">
          <ClockIcon />
        </div>
        <div>
          <h3 className="font-bold text-[#e8e8ed] mb-1">{t('informacion.reserveTitle')}</h3>
          <p className="text-sm text-[#8e8e9a] leading-relaxed mb-3">
            {t('informacion.reserveDesc')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 text-xs">
            <div className="flex items-start gap-2 text-[#8e8e9a]">
              <TrustGlyph tipo="adelante" className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
              {t('informacion.reservePoint1')}
            </div>
            <div className="flex items-start gap-2 text-[#8e8e9a]">
              <TrustGlyph tipo="adelante" className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
              {t('informacion.reservePoint2')}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
