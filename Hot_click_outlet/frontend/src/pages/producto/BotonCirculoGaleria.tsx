import type { ReactNode } from 'react'

type BotonCirculoGaleriaProps = {
  onClick: () => void
  etiqueta: string
  /** `principal` (28:839): sombra suave. `estado` (44:1775, 44:1849, 44:1917): plano. */
  estilo: 'principal' | 'estado'
  children: ReactNode
  pulsado?: boolean
}

/** Botón circular blanco de 40 px sobre la foto de la galería (atrás, compartir, favorito). */
export default function BotonCirculoGaleria({ onClick, etiqueta, estilo, children, pulsado }: BotonCirculoGaleriaProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      aria-pressed={pulsado}
      className={`flex size-10 shrink-0 items-center justify-center rounded-full bg-hc-n-0 text-hc-n-900 ${
        estilo === 'principal' ? 'shadow-[0px_2px_6px_0px_rgba(0,0,0,0.1)]' : ''
      }`}
    >
      {children}
    </button>
  )
}
