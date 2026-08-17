import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

/** Condiciones de producto. */
export default function ConditionsSection() {
  const { t } = useTranslation()

  const CONDITIONS = [
    { label: t('informacion.cond1Label'), badge: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400', desc: t('informacion.cond1Desc'), points: [t('informacion.cond1p1'), t('informacion.cond1p2'), t('informacion.cond1p3')] },
    { label: t('informacion.cond2Label'), badge: 'bg-[#4f7cff]/15 border-[#4f7cff]/30 text-[#4f7cff]', desc: t('informacion.cond2Desc'), points: [t('informacion.cond2p1'), t('informacion.cond2p2'), t('informacion.cond2p3')] },
    { label: t('informacion.cond3Label'), badge: 'bg-amber-500/15 border-amber-500/30 text-amber-400', desc: t('informacion.cond3Desc'), points: [t('informacion.cond3p1'), t('informacion.cond3p2'), t('informacion.cond3p3')] },
  ]

  return (
    <section>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#e8e8ed]">{t('informacion.conditionsTitle')}</h2>
        <p className="text-[#8e8e9a] mt-1 text-sm">{t('informacion.conditionsSub')}</p>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {CONDITIONS.map(({ label, badge, desc, points }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="p-5 rounded-2xl bg-[#111114] border border-white/8 flex flex-col gap-3"
          >
            <span className={`self-start text-xs font-semibold px-2.5 py-1 rounded-full border ${badge}`}>{label}</span>
            <p className="text-sm text-[#8e8e9a] leading-relaxed">{desc}</p>
            <ul className="space-y-1.5">
              {points.map((pt) => (
                <li key={pt} className="flex items-start gap-2 text-xs text-[#8e8e9a]">
                  <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                  {pt}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
