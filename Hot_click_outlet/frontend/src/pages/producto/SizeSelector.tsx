import { tallasDesdeProducto } from './productoHelpers'
import type { TFunction } from 'i18next'
import type { NavigateFunction } from 'react-router-dom'
import type { Producto } from '@/types/producto'
import type { VarianteProducto } from './productoHelpers'

type SizeSelectorProps = {
  product: Producto
  variantes: VarianteProducto[]
  tallaSeleccionada: string | null
  onSelectTalla: (talla: string) => void
  onNavigate: NavigateFunction
  t: TFunction
}

export default function SizeSelector({
  product, variantes, tallaSeleccionada, onSelectTalla, onNavigate, t,
}: SizeSelectorProps) {
  const { tallasPropias, hermanasPorTalla } = tallasDesdeProducto(product, variantes)
  if (tallasPropias.length === 0 && hermanasPorTalla.size === 0) return null

  // Nota de stock de la talla activa, al estilo Figma ("Quedan 3 en talla 40" /
  // "Talla 41 agotada"). Las tallas propias comparten el stock del producto;
  // las hermanas (otra fila de producto) traen su propio stock.
  const hermanaActiva = tallaSeleccionada ? hermanasPorTalla.get(tallaSeleccionada) : undefined
  const stockActivo = hermanaActiva ? hermanaActiva.stock ?? null : product.stock
  const agotadas = [...hermanasPorTalla.entries()].filter(([, v]) => (v.stock ?? 0) <= 0)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-hc-muted">{t('product.size', 'Talla')}:</span>
        {tallasPropias.map((tOpt) => (
          <button key={tOpt} type="button" onClick={() => onSelectTalla(tOpt)}
            className="min-w-[2.25rem] h-9 px-2 rounded-lg border text-sm font-medium transition-colors"
            style={tallaSeleccionada === tOpt
              ? { backgroundColor: 'var(--hc-text)', color: 'var(--hc-surface)', borderColor: 'var(--hc-text)' }
              : { backgroundColor: 'transparent', color: 'var(--hc-text)', borderColor: 'var(--hc-border)' }}>
            {tOpt}
          </button>
        ))}
        {[...hermanasPorTalla.entries()].map(([tOpt, v]) => {
          const agotada = (v.stock ?? 0) <= 0
          return (
            <button key={v.id} type="button" onClick={() => onNavigate(`/productos/${v.id}`)}
              className="min-w-[2.25rem] h-9 px-2 rounded-lg border text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'transparent',
                color: agotada ? 'var(--hc-muted)' : 'var(--hc-text)',
                borderColor: 'var(--hc-border)',
                opacity: agotada ? 0.55 : 1,
                textDecoration: agotada ? 'line-through' : 'none',
              }}>
              {tOpt}
            </button>
          )
        })}
      </div>
      {(stockActivo != null || agotadas.length > 0) && (
        <p className="text-xs text-hc-muted">
          {stockActivo != null && tallaSeleccionada && (
            stockActivo > 0
              ? t('product.sizeStock', 'Quedan {{count}} en talla {{talla}}', { count: stockActivo, talla: tallaSeleccionada })
              : t('product.sizeOutOfStock', 'Talla {{talla}} agotada', { talla: tallaSeleccionada })
          )}
          {agotadas.length > 0 && (
            <>
              {stockActivo != null && tallaSeleccionada ? ' · ' : ''}
              {agotadas.map(([tOpt]) => t('product.sizeOutOfStock', 'Talla {{talla}} agotada', { talla: tOpt })).join(' · ')}
            </>
          )}
        </p>
      )}
    </div>
  )
}
