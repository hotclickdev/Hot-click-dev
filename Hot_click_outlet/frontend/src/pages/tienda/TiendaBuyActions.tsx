import { Link } from 'react-router-dom'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_PRODUCTO } from '@/pages/producto/iconosProducto'

/** Glifo − / + con área táctil mayor que el carácter (Figma `28:977`). */
function Glifo({ etiqueta, disabled, onClick, children }: { etiqueta: string; disabled?: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={etiqueta}
      className="relative flex w-[10px] items-center justify-center after:absolute after:-inset-x-[6px] after:-inset-y-3 disabled:opacity-30"
    >
      {children}
    </button>
  )
}

/**
 * Compra en la ficha de la tienda (derivado de Figma: barra fija `28:977` en móvil y fila `29:2150` en
 * escritorio): cantidad + "Agregar · ₡total" y "Comprar ahora" debajo. La lógica es la de siempre.
 */
export default function TiendaBuyActions({
  variante, slug, stockDisponible, cantidad, onCantidad, total, agregado, onAgregar, onComprarAhora,
}: {
  variante: 'barra' | 'inline'
  slug: string
  stockDisponible: number
  cantidad: number
  onCantidad: (cantidad: number) => void
  total: string
  agregado: boolean
  onAgregar: () => void
  onComprarAhora: () => void
}) {
  if (stockDisponible <= 0) return null
  const esBarra = variante === 'barra'

  const fila = (
    <div className="flex items-center gap-[10px]">
      <div className="flex shrink-0 items-center gap-[14px] rounded-xl border border-hc-n-200 bg-hc-n-0 p-3 text-[16px] font-semibold leading-[normal] text-hc-n-900">
        <Glifo etiqueta="Uno menos" disabled={cantidad <= 1} onClick={() => onCantidad(Math.max(1, cantidad - 1))}>−</Glifo>
        <span aria-live="polite" className="min-w-[7px] text-center text-[15px]">{cantidad}</span>
        <Glifo etiqueta="Uno más" disabled={cantidad >= stockDisponible} onClick={() => onCantidad(Math.min(stockDisponible, cantidad + 1))}>+</Glifo>
      </div>
      <button
        type="button"
        onClick={onAgregar}
        className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl py-[14px] text-[15px] font-semibold leading-[normal] text-hc-n-0 transition-colors ${
          agregado ? 'bg-hc-success' : 'bg-[var(--t-primary)]'
        }`}
      >
        <IconoFigma src={ICONOS_PRODUCTO.bolsa} size={18} className="text-hc-n-0" />
        <span className="whitespace-nowrap">{agregado ? 'Agregado al pedido' : `Agregar · ${total}`}</span>
      </button>
    </div>
  )

  const comprar = (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onComprarAhora}
        className="flex flex-1 items-center justify-center rounded-xl border border-hc-n-200 bg-hc-n-0 py-3 text-[14px] font-semibold leading-[normal] text-hc-n-900 hover:bg-hc-n-50"
      >
        Comprar ahora
      </button>
      {agregado && (
        <Link to={`/tienda/${slug}/carrito`} className="shrink-0 text-[13px] font-semibold text-hc-blue-600">
          Ver pedido
        </Link>
      )}
    </div>
  )

  if (esBarra) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2 border-t border-hc-n-200 bg-hc-n-0 px-4 pb-6 pt-3">
        {fila}
        {comprar}
      </div>
    )
  }
  return (
    <div className="mt-2 flex flex-col gap-3">
      {fila}
      {comprar}
    </div>
  )
}
