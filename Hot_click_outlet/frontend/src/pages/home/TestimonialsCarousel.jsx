import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Section from '@/components/ui/Section'

// ─── Testimonials ─────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  { name: 'Andrés M.', location: 'San José', rating: 5, text: 'Compré unos audífonos y llegaron en perfectas condiciones. Pedí y pagué en HotClick. 100% recomendado.' },
  { name: 'Valeria R.', location: 'Heredia', rating: 5, text: 'Encontré una laptop como nueva a un precio increíble. Elegí, pagué en la web y en 2 días la tenía en casa.' },
  { name: 'Carlos B.', location: 'Cartago', rating: 5, text: 'Excelente servicio. Me explicaron todo sobre la condición del producto antes de comprar. Llegó exactamente como lo describieron.' },
  { name: 'Sofía L.', location: 'Alajuela', rating: 5, text: 'Precios muy accesibles y productos de buena calidad. Ya es mi segunda compra y sigo igual de satisfecha con HotClick.' },
  { name: 'Diego P.', location: 'Liberia', rating: 5, text: 'Me sorprendió lo rápido que respondieron. En menos de 10 minutos ya tenía confirmado el pedido. El envío llegó sin problemas al Correos.' },
]

export default function TestimonialsCarousel() {
  const [idx, setIdx] = useState(0)
  const { t } = useTranslation()
  const prev = () => setIdx((i) => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)
  const next = () => setIdx((i) => (i + 1) % TESTIMONIALS.length)
  const visible = [
    TESTIMONIALS[idx % TESTIMONIALS.length],
    TESTIMONIALS[(idx + 1) % TESTIMONIALS.length],
    TESTIMONIALS[(idx + 2) % TESTIMONIALS.length],
  ]

  return (
    <Section title={`${t('home.testimoniosTitle')}.`} subtitle={t('home.testimoniosSub')} tone="surface">
      <div className="relative">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 overflow-hidden">
          {visible.map((t, i) => (
            <motion.div key={idx + i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: i * 0.08 }} className="hc-card p-4 sm:p-6 flex flex-col gap-3">
              <div className="flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, s) => (
                  <svg key={s} className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                ))}
              </div>
              <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--hc-muted)' }}>"{t.text}"</p>
              <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid var(--hc-border)' }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'color-mix(in srgb, var(--hc-accent) 15%, transparent)', color: 'var(--hc-accent)' }}>
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--hc-text)' }}>{t.name}</p>
                  <p className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>{t.location}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-4 mt-6">
          <button type="button" onClick={prev} aria-label={t('common.previous')}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div className="flex gap-1.5">
            {TESTIMONIALS.map((_, i) => (
              <button type="button" key={i} onClick={() => setIdx(i)} aria-label={`Ver testimonio ${i + 1}`} className="p-2.5 flex items-center justify-center" style={{ background: 'transparent', border: 'none' }}>
                <span className="block rounded-full transition-all" style={{
                  width: i === idx ? 16 : 10,
                  height: 10,
                  backgroundColor: i === idx ? 'var(--hc-accent)' : 'var(--hc-border-strong)',
                }} />
              </button>
            ))}
          </div>
          <button type="button" onClick={next} aria-label={t('common.next')}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
    </Section>
  )
}
