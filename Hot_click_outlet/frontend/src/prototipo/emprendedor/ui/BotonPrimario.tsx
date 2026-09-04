import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  type?: 'submit' | 'button'
  onClick?: () => void
  variante?: 'lleno' | 'oscuro'
  disabled?: boolean
}

/**
 * @deprecated Usar `Boton` de `@/prototipo/compartido/ui` (variante primario|oscuro).
 * CTA principal rojo (o negro POS) del prototipo Emprendedor.
 */
export default function BotonPrimario({
  children,
  type = 'button',
  onClick,
  variante = 'lleno',
  disabled = false,
}: Props) {
  const fondo = variante === 'oscuro' ? 'bg-[var(--hc-n-900)]' : 'bg-hc-primary'
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${fondo} flex min-h-11 w-full items-center justify-center rounded-[14px] px-5 py-4 text-[15px] font-bold text-white disabled:opacity-60`}
    >
      {children}
    </button>
  )
}
