import { fmt, idProductoPos, type ProductoPos } from './posProductSearchHelpers'
import TrustGlyph from '@/components/ui/TrustGlyph'

export function ProductGrid({
  items,
  onAdd,
  cantidades = {},
}: {
  items: ProductoPos[]
  onAdd: (p: ProductoPos) => void
  cantidades?: Record<string, number>
}) {
  if (!items.length) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-2 opacity-40">
        <p className="text-sm text-hc-muted">Sin productos en esta categoría</p>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((p) => (
        <TarjetaPos key={idProductoPos(p)} producto={p} qty={cantidades[idProductoPos(p)] ?? 0} onAdd={onAdd} />
      ))}
    </div>
  )
}

function TarjetaPos({ producto, qty, onAdd }: { producto: ProductoPos; qty: number; onAdd: (p: ProductoPos) => void }) {
  const stock = producto.stockActual ?? producto.stock ?? 0
  const agotado = stock <= 0
  const seleccionado = qty > 0
  const nombre = producto.nombreProducto ?? producto.nombre ?? 'Producto'
  return (
    <button
      type="button"
      onClick={() => { if (!agotado) onAdd(producto) }}
      disabled={agotado}
      className={`flex flex-col items-start gap-1.5 rounded-2xl p-2.5 text-left disabled:cursor-not-allowed disabled:opacity-40 ${
        seleccionado ? 'border-[1.5px] border-hc-primary' : 'border border-hc-border'
      }`}
    >
      <div className="relative h-24 w-full overflow-hidden rounded-xl bg-hc-surface-2">
        {producto.imagenPrincipalUrl ? (
          <img src={producto.imagenPrincipalUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center">
            <TrustGlyph tipo="paquete" className="h-10 w-10 opacity-30" />
          </div>
        )}
        {qty > 0 && (
          <span className="absolute right-1.5 top-1.5 flex size-[26px] items-center justify-center rounded-full bg-hc-primary text-xs font-bold text-white">
            {qty}
          </span>
        )}
      </div>
      <p className="line-clamp-2 w-full text-xs font-medium text-hc-text">{nombre}</p>
      <div className="flex w-full items-center justify-between">
        <span className="text-xs font-bold text-hc-primary">₡{fmt(producto.precioEfectivo ?? producto.precioVenta ?? producto.precio)}</span>
        <span
          className={`flex size-[26px] items-center justify-center rounded-full text-sm font-bold ${
            seleccionado ? 'text-hc-success' : 'bg-[var(--hc-n-900)] text-white'
          }`}
          style={seleccionado ? { background: 'var(--hc-success-bg)' } : undefined}
          aria-hidden
        >
          +
        </span>
      </div>
    </button>
  )
}
