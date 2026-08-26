import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import TrustGlyph from '@/components/ui/TrustGlyph'
import TextoFlecha from '@/components/ui/TextoFlecha'

const SERVICIO_STEPS = [
  {
    n: '01', icono: 'camara',
    labelKey: 'home.servicesStep1',
    desc: 'Mandanos la foto del producto por WhatsApp',
    accent: '#f59e0b',
    accentBg: 'rgba(245,158,11,0.10)',
    accentBorder: 'rgba(245,158,11,0.25)',
  },
  {
    n: '02', icono: 'buscar',
    labelKey: 'home.servicesStep2',
    desc: 'Consultamos todos nuestros proveedores',
    accent: 'var(--hc-accent)',
    accentBg: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)',
    accentBorder: 'color-mix(in srgb, var(--hc-accent) 28%, transparent)',
  },
  {
    n: '03', icono: 'chat',
    labelKey: 'home.servicesStep3',
    desc: 'Precio y disponibilidad en minutos',
    accent: '#10b981',
    accentBg: 'rgba(16,185,129,0.09)',
    accentBorder: 'rgba(16,185,129,0.24)',
  },
]

function PromoBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 opacity-[0.035]" style={{
        backgroundImage: `repeating-linear-gradient(-45deg, var(--hc-text) 0px, var(--hc-text) 1px, transparent 1px, transparent 14px)`,
      }} />
      <div className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.22), transparent 65%)', filter: 'blur(48px)' }} />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--hc-accent) 25%, transparent), transparent 65%)', filter: 'blur(40px)' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[200px]"
        style={{ background: 'radial-gradient(ellipse, color-mix(in srgb, var(--hc-accent) 4%, transparent), transparent 70%)' }} />
    </div>
  )
}

function PromoCopy() {
  const { t } = useTranslation()
  return (
    <div className="flex-1 max-w-md text-center lg:text-left">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.08 }}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold mb-5"
        style={{ backgroundColor: 'rgba(245,158,11,0.11)', border: '1px solid rgba(245,158,11,0.28)', color: '#b45309' }}
      >
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#f59e0b' }} />
        {t('serviciosPage.newService')}
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.14 }}
        className="font-black leading-[1.04] tracking-tight mb-4"
        style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', color: 'var(--hc-text)' }}
      >
        {t('serviciosPage.title')}
      </motion.h2>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
      >
        <p className="text-base leading-relaxed mb-1.5" style={{ color: 'var(--hc-muted)' }}>
          {t('home.servicesNotFound')}{' '}
          <strong style={{ color: 'var(--hc-text)', fontWeight: 700 }}>{t('home.servicesSend')}</strong>
        </p>
        <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--hc-muted)' }}>
          {t('home.servicesSearch')}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.27 }}
        className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
      >
        <Link to="/servicios" className="hc-btn hc-btn-primary hc-btn-lg inline-flex items-center gap-2 group">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <TextoFlecha iconClassName="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1">
            {t('home.servicesRequest')}
          </TextoFlecha>
        </Link>
      </motion.div>
    </div>
  )
}

/**
 * @param {{
 *   n: string,
 *   icono: string,
 *   label: string,
 *   desc: string,
 *   accent: string,
 *   accentBg: string,
 *   accentBorder: string,
 *   index: number,
 * }} props
 */
function PromoStep({ n, icono, label, desc, accent, accentBg, accentBorder, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 28 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.18 + index * 0.1, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="flex items-center gap-4 p-4 rounded-2xl relative z-10"
      style={{
        background: 'var(--hc-surface-2)',
        border: '1px solid var(--hc-border)',
        minWidth: 'clamp(240px, 40vw, 300px)',
        cursor: 'default',
      }}
    >
      <div className="w-[3.75rem] h-[3.75rem] rounded-xl flex flex-col items-center justify-center shrink-0 gap-0.5"
        style={{ background: accentBg, border: `1px solid ${accentBorder}` }}>
        <span style={{ color: accent }}>
          <TrustGlyph tipo={icono} className="w-5 h-5" />
        </span>
        <span className="text-[9px] font-black tracking-widest" style={{ color: accent }}>{n}</span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-bold leading-snug" style={{ color: 'var(--hc-text)' }}>{label}</span>
        <span className="text-xs leading-snug" style={{ color: 'var(--hc-muted)' }}>{desc}</span>
      </div>
    </motion.div>
  )
}

function PromoSteps() {
  const { t } = useTranslation()
  return (
    <div className="w-full lg:w-auto lg:shrink-0 relative">
      <div className="absolute left-[1.875rem] top-10 bottom-10 w-px hidden sm:block"
        style={{ background: 'linear-gradient(to bottom, rgba(245,158,11,0.5), color-mix(in srgb, var(--hc-accent) 60%, transparent), rgba(16,185,129,0.4))' }} />
      <div className="flex flex-col gap-3 sm:gap-4">
        {SERVICIO_STEPS.map((s, i) => (
          <PromoStep
            key={s.n}
            n={s.n}
            icono={s.icono}
            label={t(s.labelKey)}
            desc={s.desc}
            accent={s.accent}
            accentBg={s.accentBg}
            accentBorder={s.accentBorder}
            index={i}
          />
        ))}
      </div>
    </div>
  )
}

/** Promo de Servicios Hot: copy + pasos verticales. */
export default function ServiciosHotPromo() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-10">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-3xl overflow-hidden"
        style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
      >
        <PromoBackground />
        <div className="relative p-6 sm:p-10 lg:p-14">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-20 items-center">
            <PromoCopy />
            <PromoSteps />
          </div>
        </div>
      </motion.div>
    </section>
  )
}
