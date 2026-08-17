import { formatMontoPos } from './posHelpers'
import { CloseIcon, PackageIcon } from './posIcons'

export default function CartItem({ item, onSetCantidad, onSetPrecio, onRemove }) {
  return (
    <div className="rounded-xl p-3 flex gap-3 group"
      style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
        style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
        {item.imagen
          ? <img src={item.imagen} alt="" className="w-full h-full object-cover" />
          : <PackageIcon />}
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start justify-between gap-1">
          <p className="text-xs font-semibold line-clamp-2 leading-tight" style={{ color: '#F4F6F9' }}>
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
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff' }}>−</button>
            <input type="number" min={1} value={item.cantidad}
              onChange={e => onSetCantidad(item.id, e.target.value)}
              className="w-10 text-center text-xs font-bold rounded-md outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '3px 0' }}/>
            <button type="button" onClick={() => onSetCantidad(item.id, item.cantidad + 1)} disabled={item.cantidad >= item.stockActual}
              className="w-6 h-6 rounded-md font-bold text-sm flex items-center justify-center disabled:opacity-30"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff' }}>+</button>
          </div>

          <div className="flex-1 relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]" style={{ color: 'rgba(23,71,168,0.7)' }}>₡</span>
            <input type="text" value={formatMontoPos(item.precio)}
              onChange={e => onSetPrecio(item.id, e.target.value)}
              className="w-full pl-5 pr-2 text-xs font-bold text-right rounded-md outline-none"
              style={{
                backgroundColor: item.precio !== item.precioOriginal ? 'rgba(251,191,36,0.08)' : 'rgba(23,71,168,0.06)',
                border: `1px solid ${item.precio !== item.precioOriginal ? 'rgba(251,191,36,0.3)' : 'rgba(23,71,168,0.2)'}`,
                color: item.precio !== item.precioOriginal ? '#fbbf24' : '#7aa3ff',
                padding: '4px 8px 4px 18px',
              }}/>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-bold tabular-nums" style={{ color: 'rgba(255,255,255,0.5)' }}>
            = ₡{formatMontoPos(item.precio * item.cantidad)}
          </span>
        </div>
      </div>
    </div>
  )
}
