import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { DELAY_SELECCION_MS, EASE_PREMIUM } from './formularioMotionTokens'

type Props = Readonly<{
  titulo: string
  ayuda?: string
  seleccionado?: boolean
  atenuar?: boolean
  disabled?: boolean
  recomendado?: boolean
  icono?: ReactNode
  onSelect?: () => void
  to?: string
  children?: ReactNode
  'data-mm'?: string
}>

/**
 * Tarjeta de opción con elevación, press y check animado.
 */
export default function TarjetaOpcion({
  titulo,
  ayuda,
  seleccionado = false,
  atenuar = false,
  disabled = false,
  recomendado = false,
  icono,
  onSelect,
  to,
  children,
  'data-mm': dataMm,
}: Props) {
  const reduced = useReducedMotion() ?? false

  async function elegir() {
    if (disabled) return
    onSelect?.()
    if (recomendado) {
      await new Promise((r) => setTimeout(r, DELAY_SELECCION_MS))
    }
  }

  // Blur solo md+: en móvil `max-md:blur-none` evita el filtro (costoso / menos legible).
  const atenuada = atenuar && !seleccionado
  const clase = `group relative block w-full rounded-2xl border bg-hc-surface px-4 py-4 text-left transition-[border-color,box-shadow,opacity,transform,filter] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hc-primary/40 hover:-translate-y-1 hover:shadow-md active:scale-[0.98] ${
    seleccionado
      ? 'border-hc-primary shadow-[0_0_0_3px_color-mix(in_srgb,var(--hc-primary)_25%,transparent)]'
      : 'border-hc-border'
  } ${atenuada ? 'opacity-60 max-md:blur-none md:blur-[1.5px]' : ''} ${disabled ? 'pointer-events-none opacity-40' : ''}`

  const cuerpo = (
    <>
      <div className="flex items-start gap-3">
        {icono ? (
          <span className="mt-0.5 transition-transform duration-200 group-hover:rotate-[8deg]">{icono}</span>
        ) : null}
        <div className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold text-hc-text">{titulo}</span>
          {ayuda ? <span className="mt-1 block text-xs text-hc-muted">{ayuda}</span> : null}
          {children}
        </div>
        <span
          className={`mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ${
            seleccionado ? 'border-hc-primary bg-hc-primary' : 'border-hc-border'
          }`}
          aria-hidden
        >
          <motion.span
            className="size-2 rounded-full bg-white"
            initial={false}
            animate={{ scale: seleccionado ? 1 : 0 }}
            transition={{ duration: reduced ? 0 : 0.18, ease: EASE_PREMIUM }}
          />
        </span>
      </div>
      {recomendado && seleccionado && !reduced ? (
        <span className="pointer-events-none absolute inset-0 rounded-2xl bg-hc-primary/10 animate-ping opacity-30" />
      ) : null}
    </>
  )

  if (to) {
    return (
      <Link to={to} data-mm={dataMm} className={clase} aria-disabled={disabled || undefined}>
        {cuerpo}
      </Link>
    )
  }

  return (
    <motion.button
      type="button"
      data-mm={dataMm}
      disabled={disabled}
      onClick={() => void elegir()}
      className={clase}
      whileHover={reduced || disabled ? undefined : { y: -4 }}
      whileTap={reduced || disabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.2, ease: EASE_PREMIUM }}
    >
      {cuerpo}
    </motion.button>
  )
}
