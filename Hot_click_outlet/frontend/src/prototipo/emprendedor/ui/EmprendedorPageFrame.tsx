import type { ReactNode } from 'react'
import CabeceraAtras from './CabeceraAtras'
import EntradaPagina from '@/prototipo/compartido/motion/EntradaPagina'

type Props = {
  titulo: string
  volverA: string
  children: ReactNode
  subtitulo?: string
  extraMovil?: ReactNode
}

/**
 * Chrome móvil (atrás) + desktop (h1 28px) para pantallas Emprendimiento.
 */
export default function EmprendedorPageFrame({ titulo, volverA, children, subtitulo, extraMovil }: Props) {
  return (
    <main className="px-5 pb-10 pt-8 md:max-w-[760px] md:px-16 md:py-12">
      <EntradaPagina className="flex flex-col gap-5 md:gap-6">
        <div className="md:hidden">
          <CabeceraAtras titulo={titulo} to={volverA} extra={extraMovil} />
          {subtitulo ? <p className="text-xs text-hc-muted">{subtitulo}</p> : null}
        </div>
        <header className="hidden md:block">
          <h1 className="font-display text-[28px] font-bold">{titulo}</h1>
          {subtitulo ? <p className="mt-1 text-sm text-hc-muted">{subtitulo}</p> : null}
        </header>
        {children}
      </EntradaPagina>
    </main>
  )
}

/** Card blanca con borde Figma desktop. */
export function EmprendedorCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-hc-border bg-hc-surface p-4 md:p-6 ${className}`.trim()}>
      {children}
    </div>
  )
}

/** Fila título + detalle dentro de card (notif / cobro / ayuda). */
export function EmprendedorFilaLista({ titulo, detalle }: { titulo: string; detalle?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[15px] font-semibold text-hc-text">{titulo}</p>
      {detalle ? <p className="text-[13px] text-hc-muted">{detalle}</p> : null}
    </div>
  )
}
