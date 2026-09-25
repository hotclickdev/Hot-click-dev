import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import EmprendeSeccion from '../emprende/EmprendeSeccion'
import { PLAN_LANDING_COPY } from '../planes/planLandingCopy'

const copyFaq = PLAN_LANDING_COPY.pyme.faq[0]
const FAQ_KEYS = ['faq2', 'faq3', 'faq4'] as const

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

/** Preguntas frecuentes de la landing /para-pymes. La primera reusa la comisión ya validada en planLandingCopy. */
export default function PymeFaq() {
  const { t } = useTranslation()
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  const preguntas = [
    { pregunta: copyFaq.pregunta, respuesta: copyFaq.respuesta },
    ...FAQ_KEYS.map((key) => ({ pregunta: t(`pyme.${key}q`), respuesta: t(`pyme.${key}a`) })),
  ]

  return (
    <EmprendeSeccion
      id="mas-informacion"
      title={t('pyme.faqTitle')}
    >
      <div className="flex flex-col gap-2">
        {preguntas.map(({ pregunta, respuesta }, i) => {
          const open = openIdx === i
          return (
            <div
              key={pregunta}
              className="rounded-2xl border overflow-hidden"
              style={{ borderColor: 'var(--hc-border)', backgroundColor: 'var(--hc-surface)' }}
            >
              <button
                type="button"
                onClick={() => setOpenIdx(open ? null : i)}
                aria-expanded={open}
                className="w-full flex items-center justify-between gap-4 px-4 py-4 text-left min-h-[44px]"
              >
                <span className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>{pregunta}</span>
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
                    <p className="px-4 pb-4 text-sm leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
                      {respuesta}
                    </p>
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
