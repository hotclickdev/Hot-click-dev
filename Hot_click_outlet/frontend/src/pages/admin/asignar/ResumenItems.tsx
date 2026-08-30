import { formatPrice } from '@/utils/format'
import { totalItems, type ItemAsignar } from './asignarHelpers'

export default function ResumenItems({ items }: { items: ItemAsignar[] }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--hc-border)' }}>
      {items.map((item, i) => (
        <div key={item.productoId} className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: i < items.length - 1 ? '1px solid var(--hc-border)' : 'none' }}>
          {item.imagenUrl && <img src={item.imagenUrl} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />}
          <div className="flex-1 text-sm" style={{ color: 'var(--hc-text)' }}>{item.nombre}</div>
          <div className="text-xs" style={{ color: 'var(--hc-muted)' }}>×{item.cantidad}</div>
          <div className="text-sm font-semibold" style={{ color: 'var(--hc-accent)' }}>{formatPrice(item.cantidad * item.precioUnitario)}</div>
        </div>
      ))}
      <div className="flex justify-between px-4 py-3" style={{ backgroundColor: 'var(--hc-surface-2)' }}>
        <span className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Total</span>
        <span className="text-sm font-bold" style={{ color: 'var(--hc-accent)' }}>
          {formatPrice(totalItems(items))}
        </span>
      </div>
    </div>
  )
}
