import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import MainLayout from '@/layouts/MainLayout'
import { BENEFITS, mensajeCargaPago } from './pagoHelpers'

/**
 * Pantalla de espera mientras se verifica o captura el pago.
 * @param {{ estado: string, stripeApproved: boolean }} props
 */
export default function PagoLoading({ estado, stripeApproved }) {
  const [progress, setProgress] = useState(0)
  const [benefitIdx, setBenefitIdx] = useState(0)

  // Barra de progreso: llega a 85% mientras espera, salta a 100% al completar
  useEffect(() => {
    const target = estado === 'capturing' ? 60 : 85
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= target) { clearInterval(interval); return p }
        const step = (target - p) * 0.04
        return Math.min(p + Math.max(step, 0.3), target)
      })
    }, 120)
    return () => clearInterval(interval)
  }, [estado])

  // Rotación de beneficios cada 3s
  useEffect(() => {
    const id = setInterval(() => setBenefitIdx(i => (i + 1) % BENEFITS.length), 3000)
    return () => clearInterval(id)
  }, [])

  const benefit = BENEFITS[benefitIdx]

  return (
    <MainLayout>
      <div className="max-w-md mx-auto px-4 py-24 flex flex-col items-center gap-8 text-center">

        {/* Ícono animado */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', border: '2px solid color-mix(in srgb, var(--hc-accent) 30%, transparent)' }}>
            <svg className="w-9 h-9 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="var(--hc-accent)" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="absolute inset-0 rounded-full animate-ping opacity-20"
            style={{ background: 'var(--hc-accent)' }} />
        </div>

        {/* Texto principal */}
        <div>
          <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--hc-text)' }}>
            ¡Gracias por tu compra!
          </h2>
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
            {mensajeCargaPago(estado, stripeApproved)}
          </p>
        </div>

        {/* Barra de progreso */}
        <div className="w-full">
          <div className="w-full h-2 rounded-full overflow-hidden"
            style={{ background: 'var(--hc-surface-2)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, var(--hc-accent), color-mix(in srgb, var(--hc-accent) 70%, var(--hc-blue-300)))' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--hc-muted)' }}>
            Esto puede tardar unos segundos…
          </p>
        </div>

        {/* Beneficios rotativos */}
        <div className="w-full rounded-2xl p-4 min-h-[64px] flex items-center justify-center"
          style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={benefitIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-3"
            >
              <span className="text-2xl">{benefit.icon}</span>
              <span className="text-sm font-medium text-left" style={{ color: 'var(--hc-text)' }}>
                {benefit.text}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </MainLayout>
  )
}
