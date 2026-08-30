import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import Section from '@/components/ui/Section'

type TestimonioHome = {
  name: string
  location: string
  rating: number
  text: string
}

function leerReviews(t: TFunction): TestimonioHome[] {
  const raw = t('home.reviews', { returnObjects: true })
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      name: typeof item.name === 'string' ? item.name : '',
      location: typeof item.location === 'string' ? item.location : '',
      text: typeof item.text === 'string' ? item.text : '',
      rating: 5,
    }))
    .filter((item) => item.name && item.text)
}

export default function TestimonialsCarousel() {
  const [idx, setIdx] = useState(0)
  const { t, i18n } = useTranslation()
  const testimonials = useMemo(() => leerReviews(t), [t, i18n.language])
  const total = Math.max(testimonials.length, 1)
  const prev = () => setIdx((i) => (i - 1 + total) % total)
  const next = () => setIdx((i) => (i + 1) % total)

  if (testimonials.length === 0) return null

  const visible = [
    testimonials[idx % total]!,
    testimonials[(idx + 1) % total]!,
    testimonials[(idx + 2) % total]!,
  ]

  return (
    <Section title={`${t('home.testimoniosTitle')}.`} subtitle={t('home.testimoniosSub')} tone="surface">
      <div className="relative">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 overflow-hidden">
          {visible.map((item, i) => (
            <motion.div key={`${i18n.language}-${idx}-${i}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: i * 0.08 }} className="hc-card p-4 sm:p-6 flex flex-col gap-3">
              <div className="flex gap-0.5">
                {Array.from({ length: item.rating }).map((_, s) => (
                  <svg key={s} className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                ))}
              </div>
              <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--hc-muted)' }}>"{item.text}"</p>
              <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid var(--hc-border)' }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'color-mix(in srgb, var(--hc-accent) 15%, transparent)', color: 'var(--hc-accent)' }}>
                  {item.name[0]}
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--hc-text)' }}>{item.name}</p>
                  <p className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>{item.location}</p>
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
            {testimonials.map((_, i) => (
              <button type="button" key={i} onClick={() => setIdx(i)} aria-label={t('home.verTestimonio', { n: i + 1 })} className="p-2.5 flex items-center justify-center" style={{ background: 'transparent', border: 'none' }}>
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
