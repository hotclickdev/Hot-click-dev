import { motion, AnimatePresence } from 'framer-motion'
import { formatPrice } from '@/utils/format'
import { useTranslation } from 'react-i18next'

const SHIPPING_GOAL = 15000

export default function ShippingProgress({ total, goal = SHIPPING_GOAL }: { total: number; goal?: number }) {
  const { t } = useTranslation()
  const remaining = Math.max(0, goal - total)
  const progress = Math.min(1, total / goal)
  const achieved = remaining === 0

  return (
    <div className="space-y-2 py-3 border-t border-b" style={{ borderColor: 'var(--hc-border)' }}>
      <AnimatePresence mode="wait">
        {achieved ? (
          <motion.div
            key="achieved"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <p className="text-xs font-semibold text-emerald-400">{t('shippingProgress.achieved')}</p>
          </motion.div>
        ) : (
          <motion.p
            key="remaining"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs"
            style={{ color: 'var(--hc-muted)' }}
          >
            {t('shippingProgress.remaining', { amount: formatPrice(remaining) })}
          </motion.p>
        )}
      </AnimatePresence>

      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: 'color-mix(in srgb, var(--hc-text) 8%, transparent)' }}
      >
        <motion.div
          className={`h-full rounded-full ${achieved ? 'bg-emerald-500' : 'bg-[#4f7cff]'}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  )
}
