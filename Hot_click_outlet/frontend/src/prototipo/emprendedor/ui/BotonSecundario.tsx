import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  onClick?: () => void
  tono?: 'neutro' | 'peligro'
}

/**
 * Botón bordeado (eliminar, cancelar, agregar método).
 */
export default function BotonSecundario({ children, onClick, tono = 'neutro' }: Props) {
  const clases =
    tono === 'peligro'
      ? 'border-hc-primary text-hc-primary'
      : 'border-hc-border text-hc-text'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 w-full items-center justify-center rounded-[14px] border py-3.5 text-[13px] font-medium ${clases}`}
    >
      {children}
    </button>
  )
}
