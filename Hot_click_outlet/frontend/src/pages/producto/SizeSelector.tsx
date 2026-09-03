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

  return (
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
      {[...hermanasPorTalla.entries()].map(([tOpt, v]) => (
        <button key={v.id} type="button" onClick={() => onNavigate(`/productos/${v.id}`)}
          className="min-w-[2.25rem] h-9 px-2 rounded-lg border text-sm font-medium transition-colors"
          style={{ backgroundColor: 'transparent', color: 'var(--hc-text)', borderColor: 'var(--hc-border)' }}>
          {tOpt}
        </button>
      ))}
    </div>
  )
}
