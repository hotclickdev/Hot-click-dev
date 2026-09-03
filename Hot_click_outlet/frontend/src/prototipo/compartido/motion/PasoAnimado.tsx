import { Children, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  DELAY_HIJOS_S,
  DESPLAZAMIENTO_ITEM_PX,
  DURACION_REDUCED_S,
  SPRING_ENTRADA,
  STAGGER_HIJOS_S,
  type DireccionPaso,
  variantesPaso,
} from './formularioMotionTokens'

type Props = Readonly<{
  pasoKey: string | number
  direccion: DireccionPaso
  children: ReactNode
  onTransicionChange?: (activa: boolean) => void
}>

/**
 * Slide + spring por paso; stagger de hijos; popLayout para menos dead air.
 */
export default function PasoAnimado({
  pasoKey,
  direccion,
  children,
  onTransicionChange,
}: Props) {
  const reduced = useReducedMotion() ?? false
  const variantes = variantesPaso(direccion, reduced)
  const [altura, setAltura] = useState<number | undefined>(undefined)
  const nodoRef = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    const el = nodoRef.current
    if (!el) return
    setAltura(el.offsetHeight)
    const ro = new ResizeObserver(() => {
      if (nodoRef.current) setAltura(nodoRef.current.offsetHeight)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [pasoKey])

  const animateConStagger =
    typeof variantes.animate === 'object' && variantes.animate
      ? {
          ...variantes.animate,
          transition: {
            ...(variantes.animate.transition ?? {}),
            staggerChildren: reduced ? 0 : STAGGER_HIJOS_S,
            delayChildren: reduced ? 0 : DELAY_HIJOS_S,
          },
        }
      : variantes.animate

  const hijoVariants = reduced
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: DURACION_REDUCED_S } },
        exit: { opacity: 0, transition: { duration: DURACION_REDUCED_S } },
      }
    : {
        initial: { opacity: 0, y: DESPLAZAMIENTO_ITEM_PX },
        animate: { opacity: 1, y: 0, transition: SPRING_ENTRADA },
        exit: { opacity: 0, y: -8, transition: { duration: 0.18 } },
      }

  return (
    <div className="relative overflow-hidden" style={{ minHeight: altura }}>
      <AnimatePresence mode="popLayout" onExitComplete={() => onTransicionChange?.(false)}>
        <motion.div
          key={pasoKey}
          ref={nodoRef}
          className="will-change-transform flex flex-col gap-4"
          variants={{
            initial: variantes.initial,
            animate: animateConStagger,
            exit: variantes.exit,
          }}
          initial="initial"
          animate="animate"
          exit="exit"
          onAnimationStart={() => onTransicionChange?.(true)}
          onAnimationComplete={() => onTransicionChange?.(false)}
        >
          {Children.map(children, (hijo, i) => {
            if (hijo == null || typeof hijo === 'boolean') return hijo
            return (
              <motion.div key={i} variants={hijoVariants}>
                {hijo}
              </motion.div>
            )
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
