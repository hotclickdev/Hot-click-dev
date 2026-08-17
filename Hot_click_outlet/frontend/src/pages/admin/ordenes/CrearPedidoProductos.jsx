import { useTranslation } from 'react-i18next'
import { formatPrice } from '@/utils/format'
import CloseX from './CloseX'

export default function CrearPedidoProductos({ prodRef, prodSearch, showProdDrop, filteredProds, items, inp, onSearch, onAdd, onRemove, onUpdateItem }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-[var(--hc-muted)] uppercase tracking-widest">{t('adminOrders.productsLabel')}</label>
      <div className="relative" ref={prodRef}>
        <input
          type="text"
          value={prodSearch}
          onChange={(e) => onSearch(e.target.value)}
          onFocus={() => onSearch(prodSearch)}
          placeholder={t('adminOrders.searchProduct')}
          className="w-full h-10 px-3 rounded-xl text-sm placeholder:text-[var(--hc-muted)] focus:outline-none"
          style={inp}
        />
        {showProdDrop && filteredProds.length > 0 && (
          <div className="absolute z-10 top-full left-0 right-0 mt-1 rounded-xl overflow-hidden"
            style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
            {filteredProds.map((p) => {
              const id = p.id ?? p.productoId
              return (
                <button type="button" key={id}
                  onMouseDown={() => onAdd(p)}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 hover:bg-[var(--hc-surface-2)] transition-colors">
                  {p.imagenUrl && <img src={p.imagenUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--hc-text)] truncate">{p.nombre ?? p.nombreProducto}</p>
                    <p className="text-xs text-[var(--hc-muted)]">{formatPrice(p.precio ?? p.precioVenta ?? 0)}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="space-y-2 mt-2">
          {items.map((item) => (
            <div key={item.productoId} className="rounded-xl px-3 py-2.5 space-y-2"
              style={{ backgroundColor: 'var(--hc-glass-bg)', border: '1px solid var(--hc-border)' }}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-[var(--hc-text)] flex-1 leading-tight">{item.nombre}</p>
                <button type="button" onClick={() => onRemove(item.productoId)}
                  className="text-[#a8291f] shrink-0 hover:opacity-80" aria-label="Quitar producto">
                  <CloseX className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-[var(--hc-muted)]">{t('adminOrders.quantity')}</span>
                  <input type="number" min={1}
                    value={item.cantidad}
                    onChange={(e) => onUpdateItem(item.productoId, 'cantidad', e.target.value)}
                    className="w-16 h-8 px-2 rounded-lg text-sm text-center focus:outline-none"
                    style={inp}
                  />
                </div>
                <div className="flex items-center gap-1 flex-1">
                  <span className="text-xs text-[var(--hc-muted)]">₡</span>
                  <input type="number" min={0}
                    value={item.precioUnitario}
                    onChange={(e) => onUpdateItem(item.productoId, 'precioUnitario', e.target.value)}
                    className="flex-1 h-8 px-2 rounded-lg text-sm focus:outline-none"
                    style={inp}
                  />
                </div>
                <span className="text-xs text-[var(--hc-muted)] self-center shrink-0">
                  = {formatPrice((Number.parseInt(item.precioUnitario) || 0) * (Number.parseInt(item.cantidad) || 0))}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
