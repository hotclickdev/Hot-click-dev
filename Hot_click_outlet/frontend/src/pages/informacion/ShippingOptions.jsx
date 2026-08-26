import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { TruckIcon, BoltIcon } from './informacionIcons'
import TrustGlyph from '@/components/ui/TrustGlyph'

/** Opciones de envío: Correos CR y envío rápido de checkout. */
export default function ShippingOptions() {
  const { t } = useTranslation()
  return (
    <section>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#e8e8ed]">{t('informacion.shippingTitle')}</h2>
        <p className="text-[#8e8e9a] mt-1 text-sm">{t('informacion.shippingSectionSub')}</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">

        {/* Correos CR */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="p-6 rounded-2xl bg-[#111114] border border-white/8 flex flex-col gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#4f7cff]/10 border border-[#4f7cff]/20 flex items-center justify-center text-[#4f7cff]">
              <TruckIcon />
            </div>
            <div>
              <h3 className="font-semibold text-[#e8e8ed]">{t('informacion.shippingCorreosTitle')}</h3>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#4f7cff]/15 border border-[#4f7cff]/20 text-[#4f7cff]">{t('informacion.shippingCorreosBadge')}</span>
            </div>
          </div>
          <ul className="space-y-2.5">
            {[t('informacion.correosP1'), t('informacion.correosP2'), t('informacion.correosP3'), t('informacion.correosP4')].map((pt) => (
              <li key={pt} className="flex items-start gap-2 text-sm text-[#8e8e9a]">
                <TrustGlyph tipo="adelante" className="w-3.5 h-3.5 text-[#4f7cff] mt-0.5 shrink-0" />{pt}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Envío rápido */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="p-6 rounded-2xl bg-[#111114] border border-white/8 flex flex-col gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <BoltIcon />
            </div>
            <div>
              <h3 className="font-semibold text-[#e8e8ed]">{t('informacion.shippingUberTitle')}</h3>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/20 text-amber-400">{t('informacion.shippingUberBadge')}</span>
            </div>
          </div>
          <ul className="space-y-2.5">
            {[t('informacion.uberP1'), t('informacion.uberP2'), t('informacion.uberP3'), t('informacion.uberP4')].map((pt) => (
              <li key={pt} className="flex items-start gap-2 text-sm text-[#8e8e9a]">
                <TrustGlyph tipo="adelante" className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />{pt}
              </li>
            ))}
          </ul>
          <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/15 text-xs leading-relaxed" style={{ color: 'var(--hc-text)' }}>
            {t('informacion.uberNote')}
          </div>
        </motion.div>

      </div>
    </section>
  )
}
