import { formatPrice } from '@/utils/format'
import CloseIcon from '@/components/ui/CloseIcon'
import type { Producto } from '@/types/producto'
import type { ItemCarritoVenta } from './nuevaVentaHelpers'

export default function CartItems({ items, onUpdateQty, onRemove }: {
  items: ItemCarritoVenta[]
  onUpdateQty: (id: Producto['id'], val: string) => void
  onRemove: (id: Producto['id']) => void
}) {
  if (items.length === 0) {
    return (
      <div className="bg-white/2 border border-white/5 rounded-xl px-4 py-6 text-center text-xs text-[#8e8e9a]">
        Selecciona productos de la lista
      </div>
    )
  }
  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
      {items.map((i) => (
        <div key={i.id} className="flex items-center gap-3 bg-white/3 border border-white/8 rounded-xl px-3 py-2.5">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#e8e8ed] truncate">{i.nombre}</p>
            <p className="text-xs text-[#8e8e9a]">{formatPrice(i.precio)} c/u</p>
          </div>
          <input
            type="number" min="1" max={i.stock} value={i.cantidad}
            onChange={(e) => onUpdateQty(i.id, e.target.value)}
            className="w-14 h-7 text-center text-sm bg-white/5 border border-white/10 rounded-lg text-[#e8e8ed] focus:outline-none"
          />
          <span className="text-xs font-semibold text-[#e8e8ed] w-16 text-right">{formatPrice(i.precio * i.cantidad)}</span>
          <button type="button" onClick={() => onRemove(i.id)} aria-label="Quitar del pedido" className="text-[#8e8e9a] hover:text-red-400 transition-colors">
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
