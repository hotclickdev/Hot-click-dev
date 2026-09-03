import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { DELAY_SELECCION_MS, EASE_PREMIUM, SPRING_POP } from './formularioMotionTokens'

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

const CLASE_BASE =
  'group relative block w-full rounded-2xl border bg-hc-surface px-4 py-4 text-left transition-[border-color,box-shadow,opacity,filter] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hc-primary/40'

/**
 * Tarjeta de opción con elevación Framer (sin pelea CSS translate), press y check layoutId.
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

  const atenuada = atenuar && !seleccionado
  const clase = `${CLASE_BASE} ${
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
          className={`relative mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ${
            seleccionado ? 'border-hc-primary bg-hc-primary' : 'border-hc-border'
          }`}
          aria-hidden
        >
          <motion.span
            className="size-2 rounded-full bg-white"
            initial={false}
            animate={{ scale: seleccionado ? 1 : 0 }}
            transition={reduced ? { duration: 0 } : SPRING_POP}
          />
        </span>
      </div>
      {recomendado && seleccionado && !reduced ? (
        <span className="pointer-events-none absolute inset-0 rounded-2xl bg-hc-primary/10 animate-ping opacity-30" />
      ) : null}
    </>
  )

  const hoverTap = reduced || disabled ? undefined : { y: -4 }
  const tap = reduced || disabled ? undefined : { scale: 0.98 }

  if (to) {
    return (
      <motion.div whileHover={hoverTap} whileTap={tap} transition={{ duration: 0.2, ease: EASE_PREMIUM }}>
        <Link to={to} data-mm={dataMm} className={clase} aria-disabled={disabled || undefined}>
          {cuerpo}
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.button
      type="button"
      data-mm={dataMm}
      disabled={disabled}
      onClick={() => void elegir()}
      className={clase}
      whileHover={hoverTap}
      whileTap={tap}
      transition={{ duration: 0.2, ease: EASE_PREMIUM }}
    >
      {cuerpo}
    </motion.button>
  )
}
