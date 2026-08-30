import type { ReactNode } from 'react'

type Props = {
  activo: boolean
  children: ReactNode
  onClick: () => void
}

/**
 * Chip de filtro (Todos / categoría / período).
 */
export default function ChipFiltro({ activo, children, onClick }: Props) {
  const clases = activo
    ? 'bg-hc-primary text-white'
    : 'border border-hc-border bg-hc-surface text-hc-text'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 shrink-0 items-center rounded-full px-3.5 py-2 text-[11px] font-medium ${clases}`}
    >
      {children}
    </button>
  )
}
