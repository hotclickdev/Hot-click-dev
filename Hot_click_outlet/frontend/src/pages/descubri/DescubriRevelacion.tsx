import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { DURACION_REVELACION_MS } from '@/utils/gustos'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_DESCUBRI } from './iconosDescubri'

type DescubriRevelacionProps = {
  onDone: () => void
}

/**
 * Overlay corto antes de mostrar productos y negocios recomendados (derivado de Figma: círculo de estado
 * de `29:1932` con el corazón del mazo `27:965`).
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
      className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-hc-surface/95 px-6 text-center leading-[normal]"
      role="status"
      aria-live="polite"
      data-testid="descubri-revelacion"
    >
      <motion.span
        className="flex size-[72px] items-center justify-center rounded-full bg-hc-red-50"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden="true"
      >
        <IconoFigma src={ICONOS_DESCUBRI.meGusta25} size={28} className="text-hc-red-500" />
      </motion.span>
      <p className="max-w-xs font-display text-[19px] font-bold text-hc-n-900 [text-wrap:balance]">
        {t('descubri.revealTitle')}
      </p>
      <p className="max-w-xs text-[14px] leading-5 text-hc-n-600">
        {t('descubri.revealSub')}
      </p>
    </div>
  )
}
