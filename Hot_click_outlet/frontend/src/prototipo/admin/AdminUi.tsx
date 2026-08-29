import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { TonoBadge } from './adminData'

const BADGE: Record<TonoBadge, string> = {
  ok: 'bg-[var(--hc-success-bg)] text-hc-success',
  warn: 'bg-[var(--hc-warning-bg)] text-hc-warning',
  danger: 'bg-[var(--hc-danger-bg)] text-hc-danger',
  muted: 'bg-hc-surface-2 text-hc-muted',
  rol: 'bg-hc-surface-2 text-hc-text',
}

type ActionProps = {
  children: ReactNode
  className: string
  to?: string
  onClick?: () => void
  type?: 'button' | 'submit'
  dataMm?: string
}

function Action({ children, className, to, onClick, type = 'button', dataMm }: ActionProps) {
  const attrs = dataMm ? { 'data-mm': dataMm } : {}
  if (to) {
    return (
      <Link to={to} className={className} {...attrs}>
        {children}
      </Link>
    )
  }
  return (
    <button type={type} onClick={onClick} className={className} {...attrs}>
      {children}
    </button>
  )
}

const BTN =
  'flex min-h-12 w-full items-center justify-center rounded-[14px] px-4 text-sm font-semibold'

/** Chip de filtro (Figma Super Admin / POS): activo en rojo marca. */
export function AdminFilterChip({
  activo,
  onClick,
  children,
  dataMm,
}: {
  activo: boolean
  onClick: () => void
  children: string
  dataMm?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-mm={dataMm}
      className={`min-h-8 shrink-0 rounded-full px-3.5 text-[11px] font-medium ${
        activo ? 'bg-hc-primary text-white' : 'border border-hc-border bg-hc-surface text-hc-text'
      }`}
    >
      {children}
    </button>
  )
}

/** Badge de estado / rol (Figma pills). */
export function AdminBadge({ tono, children }: { tono: TonoBadge; children: string }) {
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium ${BADGE[tono]}`}>
      {children}
    </span>
  )
}

export function AdminAvatar({
  letra,
  size = 'md',
  redondo = false,
}: {
  letra: string
  size?: 'sm' | 'md' | 'lg'
  redondo?: boolean
}) {
  const dim = size === 'sm' ? 'size-11' : size === 'lg' ? 'size-14' : 'size-12'
  const text = size === 'lg' ? 'text-xl' : 'text-base'
  const forma = redondo ? 'rounded-full' : 'rounded-xl'
  return (
    <span
      className={`flex shrink-0 items-center justify-center bg-[var(--hc-surface-3,#F1F3F6)] font-display font-bold text-hc-muted ${dim} ${text} ${forma}`}
      aria-hidden
    >
      {letra}
    </span>
  )
}

export function AdminStatCard({
  label,
  valor,
  destacado = false,
}: {
  label: string
  valor: string
  destacado?: boolean
}) {
  const fondo = destacado ? 'bg-[var(--hc-danger-bg)]' : 'bg-hc-surface-2'
  const cifra = destacado ? 'text-hc-primary' : 'text-hc-text'
  return (
    <div className={`rounded-[14px] px-3.5 py-4 ${fondo}`}>
      <p className="text-[11px] font-medium text-hc-muted">{label}</p>
      <p className={`mt-1.5 font-display text-lg font-bold ${cifra}`}>{valor}</p>
    </div>
  )
}

export function AdminSearchField({
  value,
  onChange,
  placeholder,
  label,
  dataMm,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  label: string
  dataMm?: string
}) {
  return (
    <label className="block" data-mm={dataMm}>
      <span className="sr-only">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-11 w-full rounded-xl bg-hc-surface-2 px-3.5 text-sm text-hc-text placeholder:text-hc-muted"
      />
    </label>
  )
}

export function AdminChipRow<T extends string>({
  opciones,
  valor,
  onChange,
  dataMm,
}: {
  opciones: readonly T[]
  valor: T
  onChange: (v: T) => void
  dataMm?: string
}) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" data-mm={dataMm}>
      {opciones.map((opcion) => {
        const activo = opcion === valor
        return (
          <button
            key={opcion}
            type="button"
            role="tab"
            aria-selected={activo}
            onClick={() => onChange(opcion)}
            className={`min-h-8 shrink-0 rounded-full px-3 text-xs font-medium ${
              activo ? 'bg-hc-text text-hc-surface' : 'bg-hc-surface-2 text-hc-muted'
            }`}
          >
            {opcion}
          </button>
        )
      })}
    </div>
  )
}

export function AdminEntityRow({
  to,
  letra,
  titulo,
  subtitulo,
  badge,
  badgeTono,
  extra,
}: {
  to?: string
  letra: string
  titulo: string
  subtitulo: string
  badge?: string
  badgeTono?: TonoBadge
  extra?: string
}) {
  const inner = (
    <>
      <AdminAvatar letra={letra} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium">{titulo}</span>
        <span className="block truncate text-[11px] text-hc-muted">{subtitulo}</span>
      </span>
      {extra ? <span className="shrink-0 text-xs font-medium">{extra}</span> : null}
      {badge && badgeTono ? <AdminBadge tono={badgeTono}>{badge}</AdminBadge> : null}
    </>
  )
  const cls = 'flex min-h-11 items-center gap-3'
  if (!to) return <div className={cls}>{inner}</div>
  return (
    <Link to={to} className={cls}>
      {inner}
    </Link>
  )
}

export function AdminMenuRow({
  to,
  label,
  extra,
  onClick,
  peligro = false,
}: {
  to?: string
  label: string
  extra?: string
  onClick?: () => void
  peligro?: boolean
}) {
  const className = `flex min-h-14 w-full items-center justify-between gap-3 text-left ${
    peligro ? 'text-hc-primary' : ''
  }`
  const inner = (
    <>
      <span className="text-sm font-medium">{label}</span>
      <span className={peligro ? 'text-hc-primary' : 'text-hc-muted'}>{extra ?? '›'}</span>
    </>
  )
  if (to) {
    return (
      <Link to={to} className={className}>
        {inner}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  )
}

export function AdminPrimaryButton({ children, to, onClick, type }: Omit<ActionProps, 'className'>) {
  return (
    <Action to={to} onClick={onClick} type={type} className={`${BTN} bg-hc-primary text-white`}>
      {children}
    </Action>
  )
}

export function AdminDarkButton({ children, to, onClick, dataMm }: Omit<ActionProps, 'className' | 'type'>) {
  return (
    <Action to={to} onClick={onClick} dataMm={dataMm} className={`${BTN} bg-hc-text text-hc-surface`}>
      {children}
    </Action>
  )
}

export function AdminSecondaryButton({ children, to, onClick, dataMm }: Omit<ActionProps, 'className' | 'type'>) {
  return (
    <Action to={to} onClick={onClick} dataMm={dataMm} className={`${BTN} border border-hc-border bg-hc-surface text-hc-text`}>
      {children}
    </Action>
  )
}

export function AdminDangerButton({ children, to, onClick, type }: Omit<ActionProps, 'className'>) {
  return (
    <Action to={to} onClick={onClick} type={type} className={`${BTN} bg-hc-danger text-white`}>
      {children}
    </Action>
  )
}

export function AdminPairActions({
  okTo,
  okLabel,
  noTo,
  noLabel,
}: {
  okTo: string
  okLabel: string
  noTo: string
  noLabel: string
}) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2.5">
      <Link
        to={okTo}
        className="flex min-h-10 items-center justify-center rounded-lg bg-hc-text text-sm font-medium text-hc-surface"
      >
        {okLabel}
      </Link>
      <Link
        to={noTo}
        className="flex min-h-10 items-center justify-center rounded-lg border border-hc-border text-sm font-medium"
      >
        {noLabel}
      </Link>
    </div>
  )
}

export function AdminThumb() {
  return <span className="size-14 shrink-0 rounded-lg bg-hc-surface-2" aria-hidden />
}

export function AdminField({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-xs font-medium text-hc-muted">
        {label}
      </label>
      {children}
    </div>
  )
}

export const fieldClass =
  'min-h-12 w-full rounded-lg bg-hc-surface-2 px-3.5 text-sm text-hc-text placeholder:text-hc-muted'
