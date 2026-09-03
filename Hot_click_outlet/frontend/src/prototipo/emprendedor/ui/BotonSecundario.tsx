import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  onClick?: () => void
  tono?: 'neutro' | 'peligro'
  disabled?: boolean
}

/**
 * Botón bordeado (eliminar, cancelar, agregar método).
 * Misma área de clic generosa que Atrás del wizard.
 */
export default function BotonSecundario({ children, onClick, tono = 'neutro', disabled = false }: Props) {
  const clases =
    tono === 'peligro'
      ? 'border-hc-primary text-hc-primary'
      : 'border-hc-border text-hc-text'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-11 w-full items-center justify-center rounded-[14px] border py-3.5 text-[13px] font-medium disabled:opacity-40 ${clases}`}
    >
      {children}
    </button>
  )
}
