import type { TFunction } from 'i18next'
import type { NavigateFunction } from 'react-router-dom'
import type { Producto } from '@/types/producto'
import { STOCK_BAJO_MAX, opcionesDeTalla } from './productoHelpers'
import type { VarianteProducto } from './productoHelpers'

type SizeSelectorProps = {
  product: Producto
  variantes: VarianteProducto[]
  tallaSeleccionada: string | null
  onSelectTalla: (talla: string) => void
  onNavigate: NavigateFunction
  t: TFunction
}

const CHIP = 'flex h-[33px] shrink-0 items-center rounded-full border px-[14px] text-[13px] font-medium leading-[normal]'

/**
 * Selector de talla (Figma 44:1775, nodo 44:1810): chips de 33 px, la elegida en oscuro, la agotada
 * en gris tachada y una nota de stock. Las tallas propias comparten el stock del producto; las
 * hermanas son otra ficha con su propio stock y llevan a ella.
 */
export default function SizeSelector({
  product, variantes, tallaSeleccionada, onSelectTalla, onNavigate, t,
}: SizeSelectorProps) {
  const opciones = opcionesDeTalla(product, variantes)
  if (opciones.length === 0) return null

  const stockActivo = tallaSeleccionada ? product.stock : null
  const agotadas = opciones.filter((o) => o.origen === 'hermana' && (o.stock ?? 0) <= 0)
  const avisoStock = stockActivo != null && stockActivo > 0 && stockActivo <= STOCK_BAJO_MAX
  const avisoAgotada = stockActivo != null && stockActivo <= 0 && tallaSeleccionada

  return (
    <div className="flex flex-col gap-[10px] px-4 pb-1 pt-3 leading-[normal] lg:p-0">
      <p className="text-[14px] font-semibold text-hc-n-900">{t('product.size')}</p>
      <div className="flex flex-wrap items-center gap-2">
        {opciones.map((o) => {
          if (o.origen === 'propia') {
            const activa = tallaSeleccionada === o.talla
            return (
              <button
                key={`p-${o.talla}`}
                type="button"
                onClick={() => onSelectTalla(o.talla)}
                aria-pressed={activa}
                className={`${CHIP} ${activa ? 'border-hc-n-900 bg-hc-n-900 text-hc-n-0' : 'border-hc-n-200 bg-hc-n-0 text-hc-n-900'}`}
              >
                {o.talla}
              </button>
            )
          }
          const agotada = (o.stock ?? 0) <= 0
          return (
            <button
              key={`h-${o.talla}`}
              type="button"
              onClick={() => onNavigate(`/productos/${o.id}`)}
              className={`${CHIP} ${
                agotada
                  ? 'border-hc-n-200 bg-hc-n-100 text-[color:var(--hc-n-400)] line-through'
                  : 'border-hc-n-200 bg-hc-n-0 text-hc-n-900'
              }`}
            >
              {o.talla}
            </button>
          )
        })}
      </div>
      {(avisoStock || avisoAgotada || agotadas.length > 0) && (
        <div className="flex flex-wrap items-center gap-[6px]">
          {avisoStock && (
            <span className="rounded-full bg-hc-warning-bg px-2 py-[3px] text-[11px] font-semibold text-hc-warning">
              {t('product.sizeStock', { count: stockActivo, talla: tallaSeleccionada })}
            </span>
          )}
          {avisoAgotada && (
            <span className="text-[12px] text-hc-n-500">{t('product.sizeOutOfStock', { talla: tallaSeleccionada })}</span>
          )}
          {agotadas.length > 0 && (
            <span className="text-[12px] text-hc-n-500">
              {agotadas.map((o) => t('product.sizeOutOfStock', { talla: o.talla })).join(' · ')}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
