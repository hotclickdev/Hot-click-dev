import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { HotClickMark } from '@/components/ui/BrandLogo'
import { MONTO_PENDIENTE, PASOS_ALTA, type BeneficioPlan } from './altaVendedorPlanes'

/**
 * Piezas del alta de vendedor (propuesta de Diseño aprobada 3-oct-2026, /workspace/diseno/01-alta-vendedor).
 * Derivadas de Figma: header y fondo de 30:2385 / 28:1083, pasos 28:1096, tarjetas radio 29:1344,
 * campos 28:1083 y nota 44:1580. Solo tokens del manual: n50/n200/n600/n900, b50/b100/b600, rojo #E73B33.
 */

export function AltaHeader({ derecha }: { derecha: ReactNode }) {
  return (
    <header className="sticky top-0 z-10 border-b border-hc-n-200 bg-hc-n-0">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4 lg:h-16 lg:px-6">
        <Link to="/" className="flex items-center gap-2 no-underline" aria-label="HotClick, ir al inicio">
          <HotClickMark size={28} className="shrink-0" />
          <span className="hc-wordmark text-[17px]"><span className="hot">Hot</span><span className="click">Click</span></span>
        </Link>
        <div className="text-[13px] text-hc-n-600">{derecha}</div>
      </div>
    </header>
  )
}

/** Tres barras de 4 px (b600 hecho o en curso, n200 pendiente) con "1 · Plan / 2 · Tu negocio / 3 · Activar". */
export function AltaPasos({ paso }: { paso: number }) {
  return (
    <nav aria-label="Pasos del registro" className="w-full">
      <ol className="grid grid-cols-3 gap-2">
        {PASOS_ALTA.map((nombre, i) => {
          const activo = i <= paso
          return (
            <li key={nombre} aria-current={i === paso ? 'step' : undefined} className="flex flex-col gap-1.5">
              <span className={`h-1 rounded-full ${activo ? 'bg-hc-blue-600' : 'bg-hc-n-200'}`} />
              <span className={`text-[11px] leading-4 ${i === paso ? 'font-semibold text-hc-n-900' : 'text-hc-n-600'}`}>
                {i + 1} · {nombre}
              </span>
            </li>
          )
        })}
      </ol>
      <p className="mt-4 text-[12px] text-hc-n-600">Paso {paso + 1} de 3</p>
    </nav>
  )
}

/** Título Sora con una sola palabra en rojo (convención del CTA "Vendé en HotClick" del Home 9:171). */
export function AltaTitulo({ antes, acento, despues, sub }: { antes: string; acento: string; despues?: string; sub?: ReactNode }) {
  return (
    <div className="mt-1">
      <h1 className="font-[family-name:var(--hc-font-display)] text-[28px] font-bold leading-[34px] text-hc-n-900 lg:text-[32px] lg:leading-[40px]">
        {antes} <span className="text-hc-red-500">{acento}</span>{despues ? ` ${despues}` : ''}
      </h1>
      {sub ? <p className="mt-1.5 text-[14px] leading-[21px] text-hc-n-600">{sub}</p> : null}
    </div>
  )
}

export function AltaTarjeta({ titulo, sub, children, className = '' }: { titulo?: string; sub?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-4 lg:p-5 ${className}`}>
      {titulo ? <h2 className="font-[family-name:var(--hc-font-display)] text-[17px] font-bold text-hc-n-900">{titulo}</h2> : null}
      {sub ? <p className="mt-0.5 text-[12px] text-hc-n-600">{sub}</p> : null}
      <div className={titulo ? 'mt-3.5 flex flex-col gap-3.5' : 'flex flex-col gap-3.5'}>{children}</div>
    </section>
  )
}

export function PillPendiente() {
  return (
    <span className="inline-flex items-center rounded-full bg-hc-n-100 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-hc-n-600">
      {MONTO_PENDIENTE}
    </span>
  )
}

export function BotonPrimario({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-hc-red-500 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-hc-red-600 disabled:cursor-not-allowed disabled:bg-hc-n-200 disabled:text-hc-n-600 ${className}`}
    >
      {children}
    </button>
  )
}

export function BotonSecundario({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-5 text-[15px] font-semibold text-hc-n-900 transition-colors hover:bg-hc-n-50 disabled:cursor-not-allowed disabled:text-hc-n-600 ${className}`}
    >
      {children}
    </button>
  )
}

export function Casilla({ checked, onChange, children, id }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; id: string }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-[19px] text-hc-n-900">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer accent-[var(--hc-blue-600)]"
      />
      <span>{children}</span>
    </label>
  )
}

export function Nota({ children, titulo }: { children: ReactNode; titulo?: string }) {
  return (
    <div className="flex gap-2.5 rounded-[12px] bg-hc-blue-50 p-3 text-[13px] leading-[19px] text-hc-n-900">
      <IconoInfo />
      <p>{titulo ? <strong className="font-semibold">{titulo} </strong> : null}{children}</p>
    </div>
  )
}

export function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

const SVG = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }

export function IconoInfo() {
  return <svg {...SVG} className="mt-px shrink-0 text-hc-blue-600"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
}

export function IconoCheck() {
  return <svg {...SVG} className="shrink-0 text-hc-success"><path d="M20 6 9 17l-5-5" /></svg>
}

export function IconoBeneficio({ icono }: { icono: BeneficioPlan['icono'] | 'etiqueta' }) {
  const cls = 'mt-px shrink-0 text-hc-blue-600'
  if (icono === 'contacto') return <svg {...SVG} className={cls}><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 1 1 21 11.5Z" /></svg>
  if (icono === 'productos') return <svg {...SVG} className={cls}><path d="m21 8-9-5-9 5 9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></svg>
  if (icono === 'bodegas') return <svg {...SVG} className={cls}><path d="M3 21V9l9-6 9 6v12" /><path d="M7 21v-8h10v8M7 17h10" /></svg>
  if (icono === 'pos') return <svg {...SVG} className={cls}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M7 20h10M12 16v4" /></svg>
  if (icono === 'equipo') return <svg {...SVG} className={cls}><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0M16 4a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.7" /></svg>
  if (icono === 'ia') return <svg {...SVG} className={cls}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M6.3 6.3l2 2M15.7 15.7l2 2M6.3 17.7l2-2M15.7 8.3l2-2" /></svg>
  if (icono === 'escudo') return <svg {...SVG} className={cls}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></svg>
  return <svg {...SVG} className={cls}><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg>
}
