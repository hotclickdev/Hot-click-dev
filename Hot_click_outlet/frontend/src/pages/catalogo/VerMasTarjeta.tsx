import type { ReactNode } from 'react'
import TextoFlecha from '@/components/ui/TextoFlecha'

/** Tarjeta "ver más" al final de una fila de categoría: mismo ancho (167) y alto (280) que `ProductCard`. */
export default function VerMasTarjeta({
  cantidad, unidad, categoria, icono, onClick,
}: {
  cantidad?: number
  unidad: string
  categoria: string
  icono?: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hidden h-[280px] w-[167px] flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-hc-n-200 bg-hc-n-0 px-4 text-center transition-colors hover:bg-hc-n-100 sm:flex"
    >
      {cantidad != null && cantidad > 0 ? (
        <span className="font-display text-[26px] font-bold leading-none text-hc-n-900">+{cantidad}</span>
      ) : icono}
      <span className="text-[12px] font-semibold text-hc-n-600">{unidad}</span>
      <span className="text-[11px] leading-[15px] text-hc-n-500">{categoria}</span>
      <span className="text-[12px] font-semibold text-hc-blue-600">
        <TextoFlecha iconClassName="w-3.5 h-3.5">Ver categoría completa</TextoFlecha>
      </span>
    </button>
  )
}
