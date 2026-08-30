import type { Id } from '@/types/api'
import { formatMontoPos, type ItemCarritoPos } from './posHelpers'
import { CloseIcon, PackageIcon } from './posIcons'

export default function CartItem({ item, onSetCantidad, onSetPrecio, onRemove }: {
  item: ItemCarritoPos
  onSetCantidad: (id: Id | undefined, val: string | number) => void
  onSetPrecio: (id: Id | undefined, val: string) => void
  onRemove: (id: Id | undefined) => void
}) {
  return (
    <div className="rounded-xl p-3 flex gap-3 group"
      style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
      <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
        style={{ backgroundColor: 'var(--hc-surface-2)' }}>
        {item.imagen
          ? <img src={item.imagen} alt="" className="w-full h-full object-cover" />
          : <PackageIcon />}
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start justify-between gap-1">
          <p className="text-xs font-semibold line-clamp-2 leading-tight" style={{ color: 'var(--hc-text)' }}>
            {item.nombre}
          </p>
          <button type="button" onClick={() => onRemove(item.id)}
            className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
            <CloseIcon />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => onSetCantidad(item.id, item.cantidad - 1)} disabled={item.cantidad <= 1}
              className="w-6 h-6 rounded-md font-bold text-sm flex items-center justify-center disabled:opacity-30"
              style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-text)' }}>−</button>
            <input type="number" min={1} value={item.cantidad}
              data-pos-qty
              onChange={e => onSetCantidad(item.id, e.target.value)}
              className="w-10 text-center text-xs font-bold rounded-md outline-none"
              style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)', padding: '3px 0' }}/>
            <button type="button" onClick={() => onSetCantidad(item.id, item.cantidad + 1)} disabled={item.cantidad >= item.stockActual}
              className="w-6 h-6 rounded-md font-bold text-sm flex items-center justify-center disabled:opacity-30"
              style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-text)' }}>+</button>
          </div>

          <div className="flex-1 relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]" style={{ color: 'rgba(23,71,168,0.7)' }}>₡</span>
            <input type="text" value={formatMontoPos(item.precio)}
              onChange={e => onSetPrecio(item.id, e.target.value)}
              className="w-full pl-5 pr-2 text-xs font-bold text-right rounded-md outline-none"
              style={{
                backgroundColor: item.precio !== item.precioOriginal ? 'rgba(251,191,36,0.08)' : 'rgba(23,71,168,0.06)',
                border: `1px solid ${item.precio !== item.precioOriginal ? 'rgba(251,191,36,0.3)' : 'rgba(23,71,168,0.2)'}`,
                color: item.precio !== item.precioOriginal ? '#b45309' : 'var(--hc-link)',
                padding: '4px 8px 4px 18px',
              }}/>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--hc-muted)' }}>
            = ₡{formatMontoPos(Number(item.precio) * item.cantidad)}
          </span>
        </div>
      </div>
    </div>
  )
}
