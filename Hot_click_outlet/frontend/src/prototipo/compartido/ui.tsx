import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

type ChipProps = {
  activo?: boolean
  children: ReactNode
  onClick?: () => void
}

export function Chip({ activo = false, children, onClick }: ChipProps) {
  const base = 'min-h-8 shrink-0 rounded-full px-3.5 py-2 text-[11px] font-medium'
  const estilo = activo
    ? 'bg-hc-primary text-white'
    : 'border border-hc-border bg-hc-surface text-hc-text'
  return (
    <button type="button" onClick={onClick} className={`${base} ${estilo}`}>
      {children}
    </button>
  )
}

type BotonProps = {
  children: ReactNode
  to?: string
  onClick?: () => void
  variante?: 'primario' | 'oscuro' | 'contorno' | 'peligro' | 'suave'
  type?: 'button' | 'submit'
}

export function Boton({ children, to, onClick, variante = 'primario', type = 'button' }: BotonProps) {
  const estilos: Record<NonNullable<BotonProps['variante']>, string> = {
    primario: 'bg-hc-primary text-white',
    oscuro: 'bg-hc-text text-white',
    contorno: 'border border-hc-border bg-hc-surface text-hc-text',
    peligro: 'bg-hc-primary text-white',
    suave: 'border border-hc-border text-hc-text',
  }
  const clase = `flex min-h-11 w-full items-center justify-center rounded-[14px] px-4 py-3 text-sm font-bold ${estilos[variante]}`
  if (to?.startsWith('http')) {
    return <a href={to} className={clase} target="_blank" rel="noreferrer">{children}</a>
  }
  if (to) {
    return <Link to={to} className={clase}>{children}</Link>
  }
  return (
    <button type={type} onClick={onClick} className={clase}>
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
}

export function Campo({ etiqueta, defaultValue, value, onChange, placeholder, type = 'text' }: CampoProps) {
  return (
    <label className="mb-4 block">
      <span className="mb-2 block text-xs font-medium text-hc-muted">{etiqueta}</span>
      <input
        type={type}
        defaultValue={onChange ? undefined : defaultValue}
        value={onChange ? value : undefined}
        onChange={onChange ? (evento) => onChange(evento.target.value) : undefined}
        placeholder={placeholder}
        className="min-h-12 w-full rounded-xl bg-hc-surface-2 px-3.5 text-sm text-hc-text placeholder:text-hc-muted"
      />
    </label>
  )
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

export function FilaOpcion({ to, label, peligro = false }: { to: string; label: string; peligro?: boolean }) {
  const color = peligro ? 'text-hc-primary' : 'text-hc-text'
  return (
    <Link to={to} className={`flex min-h-14 items-center justify-between border-b border-hc-border ${color}`}>
      <span className="text-sm font-medium">{label}</span>
      <span className="text-base font-bold text-hc-muted" aria-hidden>›</span>
    </Link>
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
