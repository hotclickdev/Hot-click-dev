import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import EmprendeSeccion from '../emprende/EmprendeSeccion'
import { PLAN_LANDING_COPY } from '../planes/planLandingCopy'

const copyFaq = PLAN_LANDING_COPY.plus.faq

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

/**
 * FAQ de /negocio-plus-plan. La primera pregunta reusa el dato existente en
 * planLandingCopy.plus.faq (dato central de comisión/diferenciación); las
 * otras tres son texto narrativo propio del Figma, agregado en i18n.
 */
export default function NegocioPlusFaq() {
  const { t } = useTranslation()
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  const preguntas = [
    { q: copyFaq[0].pregunta, a: copyFaq[0].respuesta },
    { q: t('negocioPlus.faq2q'), a: t('negocioPlus.faq2a') },
    { q: t('negocioPlus.faq3q'), a: t('negocioPlus.faq3a') },
    { q: t('negocioPlus.faq4q'), a: t('negocioPlus.faq4a') },
  ]

  return (
    <EmprendeSeccion id="mas-informacion" title={t('negocioPlus.faqTitle')}>
      <div className="flex flex-col gap-2">
        {preguntas.map((item, i) => {
          const open = openIdx === i
          return (
            <div
              key={item.q}
              className="rounded-2xl border overflow-hidden"
              style={{ borderColor: 'var(--hc-border)', backgroundColor: 'var(--hc-surface)' }}
            >
              <button
                type="button"
                onClick={() => setOpenIdx(open ? null : i)}
                aria-expanded={open}
                className="w-full flex items-center justify-between gap-4 px-4 py-4 text-left min-h-[44px]"
              >
                <span className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>{item.q}</span>
                <ChevronIcon open={open} />
              </button>
              <AnimatePresence initial={false}>
                {open ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="px-4 pb-4 text-sm leading-relaxed" style={{ color: 'var(--hc-muted)' }}>{item.a}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </EmprendeSeccion>
  )
}
