import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { type DireccionPaso, variantesPaso } from './formularioMotionTokens'

type Props = Readonly<{
  pasoKey: string | number
  direccion: DireccionPaso
  children: ReactNode
  onTransicionChange?: (activa: boolean) => void
}>

/**
 * Contenedor con slide + fade según dirección; overflow hidden y altura estable.
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

  return (
    <div className="relative overflow-hidden" style={{ minHeight: altura }}>
      <AnimatePresence
        mode="wait"
        initial={false}
        onExitComplete={() => onTransicionChange?.(false)}
      >
        <motion.div
          key={pasoKey}
          ref={nodoRef}
          className="will-change-transform flex flex-col gap-4"
          variants={variantes}
          initial="initial"
          animate="animate"
          exit="exit"
          onAnimationStart={() => onTransicionChange?.(true)}
          onAnimationComplete={() => onTransicionChange?.(false)}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
