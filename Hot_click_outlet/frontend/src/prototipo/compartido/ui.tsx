import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import CampoAnimado, { type EstadoCampo } from './motion/CampoAnimado'
import { EASE_PREMIUM } from './motion/formularioMotionTokens'
import './motion/formularioMotion.css'

type ChipProps = {
  activo?: boolean
  children: ReactNode
  onClick?: () => void
}

export function Chip({ activo = false, children, onClick }: ChipProps) {
  const reduced = useReducedMotion() ?? false
  const base = 'min-h-8 shrink-0 rounded-full px-3.5 py-2 text-[11px] font-medium transition-colors duration-200'
  const estilo = activo
    ? 'bg-hc-primary text-white'
    : 'border border-hc-border bg-hc-surface text-hc-text'
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`${base} ${estilo}`}
      whileHover={reduced ? undefined : { y: -2 }}
      whileTap={reduced ? undefined : { scale: 0.96 }}
      transition={{ duration: 0.18, ease: EASE_PREMIUM }}
      animate={activo && !reduced ? { scale: [1, 1.06, 1] } : undefined}
    >
      {children}
    </motion.button>
  )
}

type BotonProps = {
  children: ReactNode
  to?: string
  onClick?: () => void
  variante?: 'primario' | 'oscuro' | 'contorno' | 'peligro' | 'suave'
  type?: 'button' | 'submit'
  disabled?: boolean
}

export function Boton({
  children,
  to,
  onClick,
  variante = 'primario',
  type = 'button',
  disabled = false,
  dataMm,
}: BotonProps & { dataMm?: string }) {
  const estilos: Record<NonNullable<BotonProps['variante']>, string> = {
    primario: 'bg-hc-primary text-white',
    oscuro: 'bg-hc-text text-white',
    contorno: 'border border-hc-border bg-hc-surface text-hc-text',
    peligro: 'bg-hc-primary text-white',
    suave: 'border border-hc-border text-hc-text',
  }
  const opacidadDeshabilitado = variante === 'contorno' || variante === 'suave' ? 'disabled:opacity-40' : 'disabled:opacity-60'
  const clase = `flex min-h-11 w-full items-center justify-center rounded-[14px] px-4 py-3 text-sm font-bold disabled:pointer-events-none ${opacidadDeshabilitado} ${estilos[variante]}`
  const attrs = dataMm ? { 'data-mm': dataMm } : {}
  if (to?.startsWith('http')) {
    return <a href={to} className={clase} target="_blank" rel="noreferrer" {...attrs}>{children}</a>
  }
  if (to && !disabled) {
    return <Link to={to} className={clase} {...attrs}>{children}</Link>
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={clase} {...attrs}>
      {children}
    </button>
  )
}

type EncabezadoProps = {
  titulo?: string
  subtitulo?: string
  volverA?: string
  extra?: ReactNode
}

export function EncabezadoPagina({ titulo, subtitulo, volverA, extra }: EncabezadoProps) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2.5">
          {volverA ? (
            <Link to={volverA} className="min-h-11 min-w-8 text-xl font-bold leading-none" aria-label="Volver">
              ←
            </Link>
          ) : null}
          {titulo ? <h1 className="font-display text-[22px] font-bold leading-tight">{titulo}</h1> : null}
        </div>
        {subtitulo ? <p className="mt-0.5 text-xs text-hc-muted">{subtitulo}</p> : null}
      </div>
      {extra}
    </header>
  )
}

type CampoProps = {
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
}

export function Campo(props: CampoProps) {
  return <CampoAnimado {...props} />
}

export function Miniatura({ className = 'size-14' }: { className?: string }) {
  return <div className={`shrink-0 rounded-xl bg-hc-surface-2 ${className}`} aria-hidden />
}

export function BadgePlan({ texto }: { texto: string }) {
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[9px] font-bold"
      style={{ background: 'var(--hc-blue-50)', color: 'var(--hc-blue-700)' }}
    >
      {texto}
    </span>
  )
}

export function FilaOpcion({
  to,
  label,
  peligro = false,
  onClick,
  dataMm,
}: {
  to?: string
  label: string
  peligro?: boolean
  onClick?: () => void
  dataMm?: string
}) {
  const color = peligro ? 'text-hc-primary' : 'text-hc-text'
  const clase = `flex min-h-14 w-full items-center justify-between border-b border-hc-border ${color}`
  const attrs = dataMm ? { 'data-mm': dataMm } : {}
  const contenido = (
    <>
      <span className="text-sm font-medium">{label}</span>
      <span className="text-base font-bold text-hc-muted" aria-hidden>›</span>
    </>
  )
  if (to) {
    return <Link to={to} className={clase} {...attrs}>{contenido}</Link>
  }
  return (
    <button type="button" onClick={onClick} className={`text-left ${clase}`} {...attrs}>
      {contenido}
    </button>
  )
}

export function IconoEstado({ variante }: { variante: 'ok' | 'alerta' | 'espera' }) {
  const fondo = variante === 'ok' ? 'var(--hc-success-bg)' : variante === 'alerta' ? 'var(--hc-danger-bg)' : 'var(--hc-n-100)'
  const marca = variante === 'ok' ? '✓' : variante === 'alerta' ? '!' : ''
  return (
    <div
      className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full text-3xl font-bold"
      style={{ background: fondo, color: variante === 'ok' ? 'var(--hc-success)' : 'var(--hc-danger)' }}
    >
      {variante === 'espera' ? (
        <span className="block size-8 rounded-full border-2 border-hc-muted border-t-transparent" aria-hidden />
      ) : (
        marca
      )}
    </div>
  )
}
