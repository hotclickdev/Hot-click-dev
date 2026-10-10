// Derivado de Tremor Card [v1.0.0] — Apache-2.0 (tremorlabs/tremor).
// Cambios: sin Slot/asChild; colores y radio con los tokens HotClick (tarjeta 14, borde n200).
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { cx } from './cx'

export const Card = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cx('relative w-full rounded-[14px] border border-hc-n-200 bg-hc-surface p-3.5 text-left', className)}
      {...props}
    />
  ),
)
Card.displayName = 'Card'

/** KPI al estilo Tremor (etiqueta + cifra). `valor` ya viene formateado; sin dato se pinta «—». */
export function Kpi({ etiqueta, valor, detalle }: { etiqueta: string; valor: string; detalle?: string }) {
  return (
    <Card>
      <p className="text-xs font-semibold text-hc-n-600">{etiqueta}</p>
      <p className="mt-1 whitespace-nowrap font-display text-[22px] font-extrabold leading-7 text-hc-n-900">{valor}</p>
      {detalle && <p className="mt-1 text-xs text-hc-n-600">{detalle}</p>}
    </Card>
  )
}
