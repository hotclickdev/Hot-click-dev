import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatoColon } from '@/theme/formatoColon'
import { IconoBuscar, IconoFlechaDer, IconoVacio, IconoVolver } from './VisitanteIcons'
import { visitanteRuta, type ProductoVisitante } from './visitanteMock'

type MainProps = {
  children: ReactNode
  conNav?: boolean
  className?: string
}

/**
 * Contenedor móvil compartido del prototipo Visitante.
 */
export default function VisitanteMain({ children, conNav = true, className = '' }: MainProps) {
  const padding = conNav ? 'pb-28' : 'pb-10'
  return (
    <main className={`mx-auto max-w-md px-[22px] pt-6 ${padding} ${className}`}>{children}</main>
  )
}

export function VisitanteTitulo({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <header className="mb-5">
      <h1 className="font-display text-2xl font-bold text-hc-text">{children}</h1>
      {sub ? <p className="mt-1 text-xs text-hc-muted">{sub}</p> : null}
    </header>
  )
}

export function VisitanteBackHeader({ titulo, to }: { titulo: string; to?: string }) {
  const navigate = useNavigate()
  return (
    <header className="mb-5 flex items-center gap-2.5">
      {to ? (
        <Link to={to} aria-label="Volver" className="flex size-11 items-center justify-center text-hc-text">
          <IconoVolver className="size-5" />
        </Link>
      ) : (
        <button
          type="button"
          aria-label="Volver"
          className="flex size-11 items-center justify-center text-hc-text"
          onClick={() => navigate(-1)}
        >
          <IconoVolver className="size-5" />
        </button>
      )}
      <h1 className="font-display text-xl font-bold text-hc-text">{titulo}</h1>
    </header>
  )
}

type BotonProps = {
  children: ReactNode
  to?: string
  href?: string
  onClick?: () => void
  variant?: 'accent' | 'danger' | 'ghost' | 'soft'
  className?: string
  type?: 'button' | 'submit'
}

export function VisitanteBoton({
  children,
  to,
  href,
  onClick,
  variant = 'accent',
  className = '',
  type = 'button',
}: BotonProps) {
  const estilos = estiloBoton(variant)
  const cls = `inline-flex min-h-11 w-full items-center justify-center rounded-full px-5 py-3.5 text-sm font-bold ${estilos} ${className}`
  if (to) return <Link to={to} className={cls}>{children}</Link>
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {children}
      </a>
    )
  }
  return (
    <button type={type} onClick={onClick} className={cls}>
      {children}
    </button>
  )
}

function estiloBoton(variant: BotonProps['variant']): string {
  if (variant === 'danger') return 'bg-hc-danger text-white'
  if (variant === 'ghost') return 'border border-hc-border bg-hc-surface text-hc-text'
  if (variant === 'soft') return 'bg-[var(--hc-blue-50)] text-hc-accent'
  return 'bg-hc-accent text-white'
}

export function VisitantePrecio({ colones, className = 'text-[13px]' }: { colones: number; className?: string }) {
  return <span className={`font-bold text-hc-primary ${className}`}>{formatoColon(colones)}</span>
}

export function VisitanteThumb({
  agotado,
  altura = 'h-[120px]',
  children,
}: {
  agotado?: boolean
  altura?: string
  children?: ReactNode
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-[var(--hc-n-100)] ${altura} ${agotado ? 'opacity-50' : ''}`}>
      {agotado ? (
        <span className="absolute left-2.5 top-2.5 rounded-full bg-hc-text px-2.5 py-1 text-[9px] font-bold text-white">
          Agotado
        </span>
      ) : null}
      {children}
    </div>
  )
}

export function VisitanteProductCard({ producto }: { producto: ProductoVisitante }) {
  return (
    <Link to={visitanteRuta(`producto/${producto.id}`)} className="flex min-w-0 flex-col gap-2">
      <VisitanteThumb agotado={producto.agotado} />
      <p className={`text-xs font-medium text-hc-text ${producto.agotado ? 'opacity-50' : ''}`}>{producto.nombre}</p>
      <p className="text-[10px] text-hc-muted">{producto.negocio}</p>
      <VisitantePrecio colones={producto.precio} />
    </Link>
  )
}

export function VisitanteSearchField({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string
  value?: string
  onChange?: (valor: string) => void
}) {
  return (
    <label className="mb-4 flex min-h-11 items-center gap-2.5 rounded-full bg-[var(--hc-n-100)] px-4 py-3">
      <span className="size-4 text-hc-muted">
        <IconoBuscar className="size-4" />
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-[13px] text-hc-text outline-none placeholder:text-hc-muted"
      />
    </label>
  )
}

export function VisitanteChip({
  activo,
  children,
  onClick,
  to,
}: {
  activo?: boolean
  children: ReactNode
  onClick?: () => void
  to?: string
}) {
  const cls = activo
    ? 'rounded-full bg-hc-accent px-4 py-2 text-xs font-medium text-white'
    : 'rounded-full border border-hc-border bg-hc-surface px-4 py-2 text-xs font-medium text-hc-text'
  if (to) return <Link to={to} className={cls}>{children}</Link>
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  )
}

export function VisitanteEmptyState({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <div className="mb-3.5 flex size-[72px] items-center justify-center rounded-full bg-[var(--hc-n-100)] text-hc-muted">
        <IconoVacio className="size-8" />
      </div>
      <p className="font-display text-[15px] font-bold text-hc-text">{titulo}</p>
      <p className="mt-1 text-xs text-hc-muted">{detalle}</p>
    </div>
  )
}

export function VisitanteMenuRow({
  to,
  children,
  peligro,
}: {
  to?: string
  children: ReactNode
  peligro?: boolean
}) {
  const color = peligro ? 'text-hc-danger' : 'text-hc-text'
  const contenido = (
    <>
      <span className={`text-sm font-medium ${color}`}>{children}</span>
      <span className={peligro ? 'text-hc-danger' : 'text-hc-muted'}>
        <IconoFlechaDer className="size-4" />
      </span>
    </>
  )
  const cls = 'flex min-h-11 w-full items-center justify-between border-b border-hc-border py-4'
  if (!to) return <div className={cls}>{contenido}</div>
  return <Link to={to} className={cls}>{contenido}</Link>
}
