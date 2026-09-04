import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { DURACION_REVELACION_MS } from '@/utils/gustos'

type DescubriRevelacionProps = {
  onDone: () => void
}

/**
 * Overlay corto antes de mostrar productos y negocios recomendados.
 * Con reduced-motion salta al resultado de inmediato.
 */
export default function DescubriRevelacion({ onDone }: DescubriRevelacionProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion() ?? false

  useEffect(() => {
    if (reduced) {
      onDone()
      return
    }
    const id = window.setTimeout(onDone, DURACION_REVELACION_MS)
    return () => window.clearTimeout(id)
  }, [onDone, reduced])

  if (reduced) return null

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col items-center justify-center px-6"
      style={{ background: 'color-mix(in srgb, var(--hc-bg) 92%, transparent)' }}
      role="status"
      aria-live="polite"
      data-testid="descubri-revelacion"
    >
      <motion.div
        className="w-16 h-16 rounded-2xl mb-5"
        style={{ background: 'var(--hc-accent)' }}
        animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.06, 1] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden="true"
      />
      <motion.p
        className="text-center text-base sm:text-lg font-bold max-w-xs"
        style={{ color: 'var(--hc-text)', fontFamily: 'var(--font-display)' }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {t('descubri.revealTitle')}
      </motion.p>
      <p className="text-sm mt-2 text-center" style={{ color: 'var(--hc-muted)' }}>
        {t('descubri.revealSub')}
      </p>
    </div>
  )
}
