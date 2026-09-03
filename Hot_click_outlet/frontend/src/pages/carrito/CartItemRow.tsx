import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '@/utils/format'
import { imagenItemCarrito, STOCK_MAX_VISIBLE, subtotalItem } from './cartHelpers'
import { PackagePlaceholder } from './cartIcons'
import type { ItemCarrito } from '@/types/carrito'
import type { Id } from '@/types/api'

type CartItemRowProps = {
  item: ItemCarrito
  onRemove: (item: ItemCarrito) => void
  onUpdateQuantity: (id: Id, cantidad: number, cartLineId?: string) => void
}

export default function CartItemRow({ item, onRemove, onUpdateQuantity }: CartItemRowProps) {
  const { t } = useTranslation()
  const imagen = imagenItemCarrito(item)
  const stockMax = item.stock ?? STOCK_MAX_VISIBLE
  const refs = item.personalizacion?.imagenes?.filter(Boolean) ?? []

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      transition={{ duration: 0.2 }}
      className="flex gap-4 p-4 bg-hc-surface border border-hc-border rounded-2xl"
    >
      <div className="w-20 h-20 rounded-xl bg-hc-surface-2 flex items-center justify-center shrink-0 overflow-hidden">
        {imagen ? (
          <img src={imagen} alt={item.nombre} className="w-full h-full object-cover" />
        ) : (
          <PackagePlaceholder />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-hc-text text-sm leading-snug truncate">
          {item.nombre}
          {item.personalizacion ? (
            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-hc-surface-2 text-hc-muted">Personalizado</span>
          ) : null}
        </h3>
        <p className="text-sm font-semibold mt-1" style={{ color: 'var(--hc-accent)' }}>
          {formatPrice(item.precio)}
        </p>
        {refs.length > 0 && (
          <div className="flex gap-1 mt-2">
            {refs.slice(0, 3).map((url) => (
              <img key={url} src={url} alt="" className="w-8 h-8 rounded object-cover border border-hc-border" />
            ))}
          </div>
        )}
        {item.personalizacion?.notas && (
          <p className="text-[11px] text-hc-muted mt-1 line-clamp-2">{item.personalizacion.notas}</p>
        )}
        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center gap-1 bg-hc-surface-2 border border-hc-border rounded-lg p-1">
            <button type="button"
              onClick={() => onUpdateQuantity(item.id as Id, item.cantidad - 1, item.cartLineId)}
              aria-label={`Reducir cantidad de ${item.nombre}`}
              className="w-11 h-11 flex items-center justify-center text-hc-muted hover:text-hc-accent hover:bg-hc-surface rounded-md transition-colors text-sm"
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-medium text-hc-text">
              {item.cantidad}
            </span>
            <button type="button"
              onClick={() => onUpdateQuantity(item.id as Id, item.cantidad + 1, item.cartLineId)}
              disabled={item.cantidad >= stockMax}
              aria-label={`Aumentar cantidad de ${item.nombre}`}
              className="w-11 h-11 flex items-center justify-center text-hc-muted hover:text-hc-accent hover:bg-hc-surface rounded-md transition-colors text-sm disabled:opacity-30"
            >
              +
            </button>
          </div>
          <button type="button"
            onClick={() => onRemove(item)}
            className="text-xs text-hc-muted hover:text-red-400 transition-colors"
          >
            {t('cart.remove')}
          </button>
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className="font-bold text-hc-text text-sm">
          {formatPrice(subtotalItem(item))}
        </p>
      </div>
    </motion.div>
  )
}
