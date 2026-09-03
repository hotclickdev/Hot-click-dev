import { useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  type PasoFormulario,
  esPrimerPaso,
  esUltimoPaso,
  etiquetaProgreso,
  indicePasoValido,
  pasoAnterior,
  siguientePasoSiValido,
} from './formularioPorPasosHelpers'
import './motion/formularioMotion.css'
import PasoAnimado from './motion/PasoAnimado'
import StepperDotLine from './motion/StepperDotLine'
import { useDireccionPaso } from './motion/useDireccionPaso'
import { EASE_PREMIUM } from './motion/formularioMotionTokens'

type Props = Readonly<{
  pasos: readonly PasoFormulario[]
  pasoActual: number
  onPasoChange: (paso: number) => void
  /** null = ok; string = mensaje de error que bloquea el avance */
  validarPaso: (paso: number) => string | null
  onFinalizar: () => void | Promise<void>
  etiquetaFinal: string
  enviando?: boolean
  children: ReactNode
  /** Si true, no muestra Atrás en el primer paso (útil cuando hay CabeceraAtras afuera). */
  ocultarAtrasEnPrimero?: boolean
  /** Desplaza el número visible (ej. tipo ya contó como paso 1). */
  progresoOffset?: number
  /** Total visible en la barra; por defecto pasos.length + offset. */
  totalProgreso?: number
  subprogreso?: number
}>

/**
 * Shell conversacional: pasos animados, stepper Dot&Line y Continuar/Atrás.
 */
export default function FormularioPorPasos({
  pasos,
  pasoActual,
  onPasoChange,
  validarPaso,
  onFinalizar,
  etiquetaFinal,
  enviando = false,
  children,
  ocultarAtrasEnPrimero = true,
  progresoOffset = 0,
  totalProgreso,
  subprogreso,
}: Props) {
  const [error, setError] = useState<string | null>(null)
  const [shakeKey, setShakeKey] = useState(0)
  const [transicionando, setTransicionando] = useState(false)
  const [successFlash, setSuccessFlash] = useState(false)
  const [saliendo, setSaliendo] = useState(false)
  const errorRef = useRef<HTMLParagraphElement | null>(null)
  const reduced = useReducedMotion() ?? false

  const total = pasos.length
  const indice = indicePasoValido(pasoActual, total)
  const paso = pasos[indice]
  const ultimo = esUltimoPaso(indice, total)
  const primero = esPrimerPaso(indice)
  const totalBarra = totalProgreso ?? total + progresoOffset
  const indiceBarra = indice + progresoOffset
  const direccion = useDireccionPaso(pasoActual)
  const bloqueado = enviando || transicionando || saliendo

  async function continuar() {
    if (bloqueado) return
    const fallo = validarPaso(indice)
    if (fallo) {
      setError(fallo)
      setShakeKey((k) => k + 1)
      queueMicrotask(() => {
        errorRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' })
      })
      return
    }
    setError(null)
    if (ultimo) {
      setSuccessFlash(true)
      setSaliendo(true)
      try {
        await onFinalizar()
      } finally {
        setSaliendo(false)
        setSuccessFlash(false)
      }
      return
    }
    onPasoChange(siguientePasoSiValido(indice, total, null))
  }

  function atras() {
    if (bloqueado || primero) return
    setError(null)
    onPasoChange(pasoAnterior(indice))
  }

  return (
    <motion.div
      className="flex flex-col gap-5"
      animate={saliendo && !reduced ? { opacity: 0.55, scale: 0.98 } : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: EASE_PREMIUM }}
    >
      <ProgresoPasos
        indice={indiceBarra}
        total={totalBarra}
        titulo={paso?.titulo}
        opcional={paso?.opcional}
        direccion={direccion}
        enviando={enviando}
        successFlash={successFlash}
        subprogreso={subprogreso}
      />

      <PasoAnimado
        pasoKey={indice}
        direccion={direccion}
        onTransicionChange={setTransicionando}
      >
        <div className={error ? 'hc-wizard-shake' : undefined} key={shakeKey}>
          {children}
        </div>
      </PasoAnimado>

      <AnimatePresence>
        {error ? (
          <motion.p
            ref={errorRef}
            key={error}
            initial={reduced ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-sm text-hc-danger"
            role="alert"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>

      <div
        className={`sticky bottom-0 z-10 -mx-1 flex flex-col gap-2 border-t border-hc-border/60 bg-hc-bg/95 px-1 py-3 backdrop-blur-sm md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-0 md:flex-row-reverse md:items-center ${
          bloqueado ? 'pointer-events-none' : ''
        }`}
        style={{ boxShadow: 'var(--hc-shadow-cta)' }}
      >
        <CtaContinuar
          enviando={enviando || saliendo}
          ultimo={ultimo}
          etiquetaFinal={etiquetaFinal}
          onClick={() => void continuar()}
        />
        {!primero || !ocultarAtrasEnPrimero ? (
          <button
            type="button"
            disabled={bloqueado || primero}
            onClick={atras}
            className="flex min-h-11 w-full items-center justify-center rounded-[14px] border border-hc-border bg-hc-surface py-3.5 text-[13px] font-medium text-hc-text transition-colors duration-200 hover:bg-hc-surface-2 disabled:opacity-40 md:w-auto md:min-w-[7.5rem] md:px-5"
          >
            Atrás
          </button>
        ) : null}
      </div>
    </motion.div>
  )
}

function CtaContinuar({
  enviando,
  ultimo,
  etiquetaFinal,
  onClick,
}: {
  enviando: boolean
  ultimo: boolean
  etiquetaFinal: string
  onClick: () => void
}) {
  const reduced = useReducedMotion() ?? false
  const label = enviando ? 'Guardando…' : ultimo ? etiquetaFinal : 'Continuar'
  return (
    <button
      type="button"
      disabled={enviando}
      onClick={onClick}
      className={`hc-wizard-cta-continuar group relative flex min-h-11 w-full items-center justify-center overflow-hidden rounded-[14px] px-5 py-4 text-[15px] font-bold text-white transition-[background-color,box-shadow] duration-200 disabled:opacity-60 md:flex-1 ${
        ultimo ? 'bg-[var(--hc-success)] hc-wizard-pulse-cta' : 'bg-hc-primary'
      }`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={label}
          className="inline-flex items-center gap-2"
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: EASE_PREMIUM }}
          layout
        >
          {enviando ? (
            <span
              className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
              aria-hidden
            />
          ) : null}
          {label}
          {!enviando && !ultimo ? (
            <span className="hc-wizard-flecha" aria-hidden>
              →
            </span>
          ) : null}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}

type ProgresoProps = Readonly<{
  indice: number
  total: number
  titulo?: string
  opcional?: boolean
  direccion?: 'forward' | 'back'
  enviando?: boolean
  successFlash?: boolean
  subprogreso?: number
}>

/** Stepper reutilizable (también fuera del shell, p. ej. elegir tipo). */
export function ProgresoPasos({
  indice,
  total,
  titulo,
  opcional,
  direccion = 'forward',
  enviando = false,
  successFlash = false,
  subprogreso,
}: ProgresoProps) {
  const seguro = Math.max(total, 1)
  const actual = indicePasoValido(indice, seguro)
  const reduced = useReducedMotion() ?? false
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={etiquetaProgreso(actual, seguro)}
            className="text-xs text-hc-muted"
            initial={reduced ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18 }}
          >
            {etiquetaProgreso(actual, seguro)}
          </motion.span>
        </AnimatePresence>
        {opcional ? (
          <span className="rounded-full border border-hc-border bg-hc-surface-2 px-2 py-0.5 text-[10px] text-hc-muted">
            Opcional
          </span>
        ) : null}
      </div>
      <StepperDotLine
        indice={actual}
        total={seguro}
        direccion={direccion}
        enviando={enviando}
        successFlash={successFlash}
        subprogreso={subprogreso}
      />
      {titulo ? (
        <AnimatePresence mode="wait" initial={false}>
          <motion.h2
            key={titulo}
            className="text-lg font-bold text-hc-text"
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: EASE_PREMIUM }}
          >
            {titulo}
          </motion.h2>
        </AnimatePresence>
      ) : null}
    </div>
  )
}
