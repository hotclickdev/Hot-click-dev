import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  DURACION_CONECTOR_ATRAS_S,
  DURACION_CONECTOR_S,
  DURACION_COLOR_S,
  EASE_PREMIUM,
  type DireccionPaso,
} from './formularioMotionTokens'

type Props = Readonly<{
  total: number
  indice: number
  direccion?: DireccionPaso
  enviando?: boolean
  successFlash?: boolean
  subprogreso?: number
}>

type EstadoNodo = 'done' | 'active' | 'pending'

function estadoNodo(idx: number, actual: number): EstadoNodo {
  if (idx < actual) return 'done'
  if (idx === actual) return 'active'
  return 'pending'
}

/**
 * Stepper Dot & Line: checks completados, nodo activo escalado, conectores L→R.
 */
export default function StepperDotLine({
  total,
  indice,
  direccion = 'forward',
  enviando = false,
  successFlash = false,
  subprogreso,
}: Props) {
  const reduced = useReducedMotion() ?? false
  const seguro = Math.max(total, 1)
  const actual = Math.min(Math.max(indice, 0), seguro - 1)
  const durConector = direccion === 'back' ? DURACION_CONECTOR_ATRAS_S : DURACION_CONECTOR_S
  const prev = useRef(actual)
  const [rippleIdx, setRippleIdx] = useState<number | null>(null)

  useEffect(() => {
    if (actual > prev.current) setRippleIdx(Math.max(actual - 1, 0))
    prev.current = actual
  }, [actual])

  return (
    <div
      className={`w-full ${successFlash ? 'hc-wizard-success-flash' : ''}`}
      role="progressbar"
      aria-valuenow={actual + 1}
      aria-valuemin={1}
      aria-valuemax={seguro}
    >
      <div className="flex w-full items-center">
        {Array.from({ length: seguro }, (_, idx) => (
          <div key={idx} className="flex min-w-0 flex-1 items-center last:flex-none last:flex-initial">
            <Nodo
              estado={estadoNodo(idx, actual)}
              idx={idx}
              reduced={reduced}
              ripple={rippleIdx === idx}
              onRippleEnd={() => setRippleIdx(null)}
            />
            {idx < seguro - 1 ? (
              <Conector
                lleno={idx < actual}
                enviando={enviando}
                duracion={durConector}
                reduced={reduced}
              />
            ) : null}
          </div>
        ))}
      </div>
      {typeof subprogreso === 'number' ? (
        <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-hc-border">
          <motion.div
            className="h-full origin-left rounded-full bg-hc-primary/70"
            initial={false}
            animate={{ scaleX: Math.min(1, Math.max(0, subprogreso)) }}
            transition={{ duration: reduced ? 0.1 : 0.3, ease: EASE_PREMIUM }}
            style={{ width: '100%' }}
          />
        </div>
      ) : null}
    </div>
  )
}

function Nodo({
  estado,
  idx,
  reduced,
  ripple,
  onRippleEnd,
}: {
  estado: EstadoNodo
  idx: number
  reduced: boolean
  ripple: boolean
  onRippleEnd: () => void
}) {
  const done = estado === 'done'
  const active = estado === 'active'
  return (
    <div className="relative flex size-7 shrink-0 items-center justify-center">
      {ripple && !reduced ? (
        <span
          className="absolute inset-0 rounded-full bg-hc-primary/25 animate-ping"
          onAnimationEnd={onRippleEnd}
          aria-hidden
        />
      ) : null}
      <motion.div
        className={`relative z-[1] flex size-6 items-center justify-center rounded-full border-2 ${
          done
            ? 'border-[var(--hc-accent)] bg-[var(--hc-accent)] text-white'
            : active
              ? 'border-hc-primary bg-hc-surface text-hc-primary'
              : 'border-hc-border bg-hc-surface text-hc-muted'
        }`}
        style={{ transition: `border-color ${DURACION_COLOR_S}s, background-color ${DURACION_COLOR_S}s` }}
        animate={
          reduced
            ? undefined
            : active
              ? { scale: 1.15 }
              : done
                ? { scale: [0.85, 1.12, 1] }
                : { scale: 1 }
        }
        transition={{ duration: 0.28, ease: EASE_PREMIUM }}
        aria-label={`Paso ${idx + 1}${done ? ' completado' : active ? ' actual' : ''}`}
      >
        {done ? <CheckSvg reduced={reduced} /> : null}
        {active ? <span className="size-2 rounded-full bg-hc-primary" /> : null}
      </motion.div>
    </div>
  )
}

function CheckSvg({ reduced }: { reduced: boolean }) {
  return (
    <motion.svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden>
      <motion.path
        d="M3.5 8.2 6.6 11.2 12.5 4.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduced ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: reduced ? 0 : 0.28, ease: EASE_PREMIUM }}
      />
    </motion.svg>
  )
}

function Conector({
  lleno,
  enviando,
  duracion,
  reduced,
}: {
  lleno: boolean
  enviando: boolean
  duracion: number
  reduced: boolean
}) {
  return (
    <div className="relative mx-1 h-0.5 min-w-[12px] flex-1 overflow-hidden rounded-full bg-hc-border">
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full bg-[var(--hc-accent)]"
        initial={false}
        animate={{
          width: lleno ? '100%' : '0%',
          opacity: enviando ? [0.45, 1, 0.45] : 1,
        }}
        transition={
          enviando && !reduced
            ? {
                opacity: { repeat: Infinity, duration: 1.1 },
                width: { duration: duracion, ease: EASE_PREMIUM },
              }
            : { duration: reduced ? 0.1 : duracion, ease: EASE_PREMIUM }
        }
      />
      {lleno && !reduced ? (
        <span className="hc-wizard-shimmer pointer-events-none absolute inset-0 opacity-70" aria-hidden />
      ) : null}
    </div>
  )
}
