import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import './formularioMotion.css'

type Props = Readonly<{
  etiqueta: string
  valor: string
  opciones: readonly string[]
  onChange: (valor: string) => void
  placeholder?: string
  deshabilitado?: boolean
  errorMensaje?: string | null
}>

/**
 * Select con la misma caja, label flotante y mensaje de error que `CampoAnimado`.
 */
export default function CampoSelectAnimado({
  etiqueta,
  valor,
  opciones,
  onChange,
  placeholder = 'Elegí una opción',
  deshabilitado = false,
  errorMensaje,
}: Props) {
  const reduced = useReducedMotion() ?? false
  return (
    <div className="mb-4">
      <label
        className={`hc-wizard-campo group relative block rounded-xl border border-transparent bg-hc-surface-2 px-3.5 pt-5 pb-2 transition-[box-shadow] duration-200 focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--hc-primary)_20%,transparent)] ${
          errorMensaje ? 'hc-wizard-campo--error' : ''
        }`}
      >
        <span className="hc-wizard-campo-label pointer-events-none absolute left-3.5 top-2 text-[10px] font-medium text-hc-muted transition-colors duration-200 group-focus-within:text-hc-primary">
          {etiqueta}
        </span>
        <select
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          disabled={deshabilitado}
          aria-invalid={errorMensaje ? true : undefined}
          className="peer min-h-9 w-full bg-transparent text-sm text-hc-text outline-none disabled:opacity-60"
        >
          <option value="">{placeholder}</option>
          {opciones.map((opcion) => (
            <option key={opcion} value={opcion}>
              {opcion}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-1 flex items-start justify-between gap-2">
        <AnimatePresence>
          {errorMensaje ? (
            <motion.p
              key={errorMensaje}
              initial={reduced ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-hc-danger"
            >
              {errorMensaje}
            </motion.p>
          ) : (
            <span />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
