import { motion, useReducedMotion } from 'framer-motion'
import { EASE_PREMIUM } from './formularioMotionTokens'
import { PASO_COLONES, ajustarEnteroString } from './stepperNumeroHelpers'
import './formularioMotion.css'

type Props = Readonly<{
  etiqueta: string
  value: string
  onChange: (valor: string) => void
  placeholder?: string
  paso?: number
  minimo?: number
  id?: string
}>

/**
 * Campo numérico entero con botones − / + (sin spinners nativos).
 * Pensado para precios en colones del wizard de producto.
 */
export default function StepperNumero({
  etiqueta,
  value,
  onChange,
  placeholder,
  paso = PASO_COLONES,
  minimo = 0,
  id,
}: Props) {
  const reduced = useReducedMotion() ?? false
  const inputId = id ?? `stepper-${etiqueta.replaceAll(/\s+/g, '-').toLowerCase()}`

  function aplicarDelta(delta: number) {
    onChange(ajustarEnteroString(value, delta, minimo))
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <label htmlFor={inputId} className="text-xs font-medium text-hc-muted">
        {etiqueta}
      </label>
      <div className="flex min-h-11 items-stretch overflow-hidden rounded-lg border border-hc-border bg-[#F8F9FB]">
        <BotonStepper
          etiqueta={`Disminuir ${etiqueta}`}
          signo="−"
          reduced={reduced}
          onClick={() => aplicarDelta(-paso)}
        />
        <input
          id={inputId}
          type="number"
          inputMode="numeric"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="hc-wizard-input-numero min-w-0 flex-1 bg-transparent px-2 text-center text-sm text-hc-text outline-none placeholder:text-hc-muted"
        />
        <BotonStepper
          etiqueta={`Aumentar ${etiqueta}`}
          signo="+"
          reduced={reduced}
          onClick={() => aplicarDelta(paso)}
        />
      </div>
    </div>
  )
}

function BotonStepper({
  etiqueta,
  signo,
  reduced,
  onClick,
}: Readonly<{
  etiqueta: string
  signo: string
  reduced: boolean
  onClick: () => void
}>) {
  return (
    <motion.button
      type="button"
      aria-label={etiqueta}
      onClick={onClick}
      className="flex min-h-11 min-w-11 shrink-0 items-center justify-center border-hc-border text-lg font-bold text-hc-text first:border-r last:border-l"
      whileTap={reduced ? undefined : { scale: 0.88 }}
      transition={{ duration: 0.16, ease: EASE_PREMIUM }}
    >
      {signo}
    </motion.button>
  )
}
