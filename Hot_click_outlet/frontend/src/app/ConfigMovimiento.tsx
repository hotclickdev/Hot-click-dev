import type { ReactNode } from 'react'
import { MotionConfig } from 'framer-motion'
import useUiStore from '@/store/uiStore'

/**
 * Las animaciones de Framer Motion respetan `prefers-reduced-motion` del sistema y el interruptor
 * "Reducir movimiento" de la hoja de accesibilidad (las de CSS las corta `index.css`).
 */
export default function ConfigMovimiento({ children }: { children: ReactNode }) {
  const reducir = useUiStore((s) => s.reduceMotion)
  return <MotionConfig reducedMotion={reducir ? 'always' : 'user'}>{children}</MotionConfig>
}
