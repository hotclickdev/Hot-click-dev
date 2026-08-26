import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Section from '@/components/ui/Section'
import { SearchStepIcon, CartStepIcon, PayStepIcon, TruckStepIcon } from './homeIcons'

/**
 * @param {{
 *   step: string,
 *   icon: import('react').ReactNode,
 *   title: string,
 *   desc: string,
 *   accent: string,
 *   index: number,
 * }} props
 */
function StepCard({ step, icon, title, desc, accent, index }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="hc-step-card relative flex flex-col items-center text-center p-4 sm:p-6 rounded-2xl"
      style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
    >
      <div
        className="hc-step-icon w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-3 sm:mb-4"
        style={{ color: accent, background: `color-mix(in srgb, ${accent} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${accent} 22%, transparent)` }}
      >
        {icon}
      </div>
      <span className="text-[10px] font-bold tracking-widest mb-2" style={{ color: accent }}>{step}</span>
      <h3 className="font-semibold mb-2" style={{ color: 'var(--hc-text)' }}>{title}</h3>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--hc-muted)' }}>{desc}</p>
    </motion.div>
  )
}

/** Pasos de “Cómo comprar” sobre azul 50. */
export default function HowItWorks() {
  const { t } = useTranslation()
  const steps = [
    { step: '01', icon: <SearchStepIcon />, title: t('home.step1Title'), desc: t('home.step1Desc'), accent: 'var(--hc-link)' },
    { step: '02', icon: <CartStepIcon />, title: t('home.step2Title'), desc: t('home.step2Desc'), accent: 'var(--hc-link)' },
    { step: '03', icon: <PayStepIcon />, title: t('home.step3Title'), desc: t('home.step3Desc'), accent: 'var(--hc-primary)' },
    { step: '04', icon: <TruckStepIcon />, title: t('home.step4Title'), desc: t('home.step4Desc'), accent: 'var(--hc-success)' },
  ]
  return (
    <Section
      id="como-comprar"
      title={`${t('home.comoComprarTitle')}.`}
      subtitle={t('home.comoComprarSub')}
      tone="blue50"
    >
      <div className="relative">
        <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--hc-blue-200), transparent)' }} />
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {steps.map((item, i) => (
            <StepCard key={item.step} {...item} index={i} />
          ))}
        </div>
      </div>
    </Section>
  )
}
