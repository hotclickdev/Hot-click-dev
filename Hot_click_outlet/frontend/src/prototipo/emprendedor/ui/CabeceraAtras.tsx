import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'

type Props = {
  titulo: string
  to: string
  extra?: ReactNode
}

/**
 * Cabecera con volver (Figma flecha tipográfica → chevron del sistema).
 */
export default function CabeceraAtras({ titulo, to, extra }: Props) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <Link to={to} className="flex size-11 shrink-0 items-center justify-center" aria-label="Volver">
          <ChevronLeftIcon className="size-5" />
        </Link>
        <h1 className="truncate font-display text-xl font-bold">{titulo}</h1>
      </div>
      {extra}
    </header>
  )
}
