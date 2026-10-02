import type { KeyboardEvent, ReactNode, Ref } from 'react'

type OpcionChipProps = {
  activa: boolean
  onClick: () => void
  children: ReactNode
  /** Texto accesible cuando el contenido visible no basta (por ejemplo "A−"). */
  etiqueta?: string
  /** Semántica de radio (grupo de una sola opción): `role=radio` y `aria-checked` en vez de `aria-pressed`. */
  radio?: boolean
  tabIndex?: number
  onKeyDown?: (e: KeyboardEvent<HTMLButtonElement>) => void
  botonRef?: Ref<HTMLButtonElement>
}

/** Opción de las hojas de ajustes (Figma `52:2354`): chip de 999 px; activa en blue/50 con borde blue/600. */
export default function OpcionChip({ activa, onClick, children, etiqueta, radio = false, tabIndex, onKeyDown, botonRef }: OpcionChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      ref={botonRef}
      tabIndex={tabIndex}
      onKeyDown={onKeyDown}
      {...(radio ? { role: 'radio', 'aria-checked': activa } : { 'aria-pressed': activa })}
      aria-label={etiqueta}
      className={`flex items-center gap-[6px] rounded-full border px-[14px] py-2 text-[13px] font-medium leading-[15px] ${
        activa ? 'border-hc-blue-600 bg-hc-blue-50 text-hc-blue-600' : 'border-hc-n-200 bg-hc-n-0 text-hc-n-900 hover:bg-hc-n-50'
      }`}
    >
      {children}
    </button>
  )
}
