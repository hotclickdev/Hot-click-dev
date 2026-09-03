import type { ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import './formularioMotion.css'

export type EstadoCampo = 'idle' | 'ok' | 'error'

type Props = Readonly<{
  etiqueta: string
  defaultValue?: string
  value?: string
  onChange?: (valor: string) => void
  placeholder?: string
  type?: string
  readOnly?: boolean
  estado?: EstadoCampo
  errorMensaje?: string | null
  maxLength?: number
  clearable?: boolean
  loading?: boolean
  help?: ReactNode
}>

/**
 * Campo con label flotante, línea de focus, clear, contador y estados ok/error.
 */
export default function CampoAnimado({
  etiqueta,
  defaultValue,
  value,
  onChange,
  placeholder = ' ',
  type = 'text',
  readOnly = false,
  estado = 'idle',
  errorMensaje,
  maxLength,
  clearable = false,
  loading = false,
  help,
}: Props) {
  const controlado = Boolean(onChange) || readOnly
  const texto = controlado ? (value ?? '') : undefined
  const reduced = useReducedMotion() ?? false
  const len = (controlado ? value : undefined)?.length ?? 0
  const contadorTone =
    maxLength == null
      ? 'text-hc-muted'
      : len > maxLength
        ? 'text-hc-danger'
        : len > maxLength * 0.85
          ? 'text-hc-warning'
          : 'text-hc-muted'

  return (
    <div className="mb-4">
      <label
        className={`hc-wizard-campo group relative block rounded-xl border border-transparent bg-hc-surface-2 px-3.5 pt-5 pb-2 transition-[box-shadow] duration-200 focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--hc-primary)_20%,transparent)] ${
          estado === 'ok' ? 'hc-wizard-campo--ok' : ''
        } ${estado === 'error' ? 'hc-wizard-campo--error' : ''}`}
      >
        <span className="hc-wizard-campo-label pointer-events-none absolute left-3.5 top-2 text-[10px] font-medium text-hc-muted transition-colors duration-200 group-focus-within:text-hc-primary">
          {etiqueta}
        </span>
        <div className="relative flex items-center gap-2">
          <input
            type={type}
            defaultValue={controlado ? undefined : defaultValue}
            value={texto}
            onChange={onChange && !readOnly ? (e) => onChange(e.target.value) : undefined}
            placeholder={placeholder}
            readOnly={readOnly}
            maxLength={maxLength}
            className="peer min-h-9 w-full bg-transparent text-sm text-hc-text outline-none placeholder:text-hc-muted read-only:opacity-80"
          />
          {loading ? (
            <span
              className="size-4 shrink-0 animate-spin rounded-full border-2 border-hc-border border-t-hc-primary"
              aria-hidden
            />
          ) : null}
          {clearable && controlado && (value?.length ?? 0) > 0 && !readOnly && onChange ? (
            <button
              type="button"
              className="text-xs font-bold text-hc-muted transition-opacity hover:text-hc-text"
              aria-label="Limpiar"
              onClick={() => onChange('')}
            >
              ✕
            </button>
          ) : null}
        </div>
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
              role="alert"
            >
              {errorMensaje}
            </motion.p>
          ) : help ? (
            <p className="text-xs text-hc-muted">{help}</p>
          ) : (
            <span />
          )}
        </AnimatePresence>
        {maxLength != null ? (
          <span className={`text-[10px] tabular-nums ${contadorTone}`}>
            {len}/{maxLength}
          </span>
        ) : null}
      </div>
    </div>
  )
}
