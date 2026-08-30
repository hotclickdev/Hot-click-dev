import { Link } from 'react-router-dom'
import { ChevronRightIcon } from '@heroicons/react/24/outline'

type Props = {
  to?: string
  onClick?: () => void
  etiqueta: string
  peligro?: boolean
  dataMm?: string
}

/**
 * Fila de menú Opciones (Figma chevron ›).
 */
export default function FilaOpcion({ to, onClick, etiqueta, peligro = false, dataMm }: Props) {
  const color = peligro ? 'text-hc-primary' : 'text-hc-text'
  const clases = `flex min-h-11 w-full items-center justify-between border-b border-hc-border py-4 text-left text-sm font-medium ${color}`
  const attrs = dataMm ? { 'data-mm': dataMm } : {}
  const contenido = (
    <>
      {etiqueta}
      <ChevronRightIcon className="size-4 shrink-0 opacity-60" />
    </>
  )
  if (to) {
    return (
      <Link to={to} className={clases} {...attrs}>
        {contenido}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={clases} {...attrs}>
      {contenido}
    </button>
  )
}
