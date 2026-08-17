import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { SearchIcon, EyeIcon, CartIcon, WhatsIcon, CheckIcon, TruckIcon } from './informacionIcons'

/** Pasos de cómo comprar. */
export default function HowToBuySection() {
  const { t } = useTranslation()

  const STEPS = [
    { n: '01', title: t('informacion.step1Title'), desc: t('informacion.step1Desc'), icon: <SearchIcon />, color: 'text-[#4f7cff]', bg: 'bg-[#4f7cff]/10', border: 'border-[#4f7cff]/20' },
    { n: '02', title: t('informacion.step2Title'), desc: t('informacion.step2Desc'), icon: <EyeIcon />, color: 'text-[var(--hc-blue-400)]', bg: 'bg-[var(--hc-blue-500)]/10', border: 'border-[var(--hc-blue-500)]/20' },
    { n: '03', title: t('informacion.step3Title'), desc: t('informacion.step3Desc'), icon: <CartIcon />, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { n: '04', title: t('informacion.step4Title'), desc: t('informacion.step4Desc'), icon: <WhatsIcon />, color: 'text-[#25D366]', bg: 'bg-[#25D366]/10', border: 'border-[#25D366]/20' },
    { n: '05', title: t('informacion.step5Title'), desc: t('informacion.step5Desc'), icon: <CheckIcon />, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    { n: '06', title: t('informacion.step6Title'), desc: t('informacion.step6Desc'), icon: <TruckIcon />, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
  ]

  return (
    <section>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#e8e8ed]">{t('informacion.howToBuy')}</h2>
        <p className="text-[#8e8e9a] mt-1 text-sm">{t('informacion.howToBuySub')}</p>
      </div>
      <div className="space-y-4">
        {STEPS.map(({ n, title, desc, icon, color, bg, border }, i) => (
          <motion.div
            key={n}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.07 }}
            className="flex gap-5 p-5 rounded-2xl bg-[#111114] border border-white/8 hover:border-white/15 transition-colors"
          >
            <div className={`w-12 h-12 rounded-xl ${bg} border ${border} flex items-center justify-center shrink-0 ${color}`}>
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold tracking-widest ${color}`}>{n}</span>
                <h3 className="font-semibold text-[#e8e8ed]">{title}</h3>
              </div>
              <p className="text-sm text-[#8e8e9a] leading-relaxed">{desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="mt-6 text-center">
        <Link
          to="/productos"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#4f7cff] hover:bg-[#3d6ee0] text-white font-semibold text-sm transition-all shadow-[0_0_24px_rgba(23,71,168,0.3)]"
        >
          {t('informacion.goCatalog')}
        </Link>
      </div>
    </section>
  )
}
