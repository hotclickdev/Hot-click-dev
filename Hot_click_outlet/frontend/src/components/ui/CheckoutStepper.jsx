import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const STEPS = [
  { id: 'cart',     href: '/carrito' },
  { id: 'checkout', href: null },
  { id: 'payment',  href: null },
  { id: 'confirm',  href: null },
]

export default function CheckoutStepper({ activeStep = 'checkout' }) {
  const { t } = useTranslation()
  const activeIdx = STEPS.findIndex((s) => s.id === activeStep)

  return (
    <nav aria-label={t('checkoutStepper.progress')} className="flex items-center justify-center mb-4 sm:mb-6 select-none">
      {STEPS.map((step, i) => {
        const done    = i < activeIdx
        const active  = i === activeIdx
        const pending = i > activeIdx
        const label   = t(`checkoutStepper.${step.id}`)
        const labelColor = active ? 'var(--hc-accent)' : done ? 'var(--hc-muted)' : 'color-mix(in srgb, var(--hc-muted) 40%, transparent)'

        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              {done && step.href ? (
                <Link to={step.href} aria-label={t('checkoutStepper.backTo', { step: label })}>
                  <StepCircle done active={false} pending={false} index={i + 1} />
                </Link>
              ) : (
                <StepCircle done={done} active={active} pending={pending} index={i + 1} />
              )}
              <span
                className="text-[10px] font-medium hidden sm:block transition-colors duration-300"
                style={{ color: labelColor }}
                aria-current={active ? 'step' : undefined}
              >
                {label}
              </span>
            </div>

            {i < STEPS.length - 1 && (
              <div
                className="w-8 sm:w-14 h-0.5 mx-1 mb-3 rounded-full transition-colors duration-500"
                style={{ background: i < activeIdx ? 'var(--hc-accent)' : 'var(--hc-border)' }}
              />
            )}
          </div>
        )
      })}
    </nav>
  )
}

function StepCircle({ done, active, pending, index }) {
  let circleStyle = { background: 'color-mix(in srgb, var(--hc-surface) 60%, transparent)', color: 'color-mix(in srgb, var(--hc-muted) 40%, transparent)', border: '1px solid var(--hc-border)' }
  if (done) circleStyle = { background: '#10b981', color: '#fff', boxShadow: '0 0 12px rgba(16,185,129,0.4)' }
  else if (active) circleStyle = { background: 'var(--hc-accent)', color: '#fff', boxShadow: '0 0 16px color-mix(in srgb, var(--hc-accent) 50%, transparent)' }
  return (
    <motion.div
      initial={false}
      animate={active ? { scale: [1, 1.1, 1] } : { scale: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
      style={circleStyle}
    >
      {done ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : index}
    </motion.div>
  )
}
