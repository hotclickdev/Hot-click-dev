import { tallasDesdeProducto } from './productoHelpers'

/**
 * Selector de talla propia y de variantes hermanas.
 */
export default function SizeSelector({ product, variantes, tallaSeleccionada, onSelectTalla, onNavigate, t }) {
  const { tallasPropias, hermanasPorTalla } = tallasDesdeProducto(product, variantes)
  if (tallasPropias.length === 0 && hermanasPorTalla.size === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-[#8e8e9a]">{t('product.size', 'Talla')}:</span>
      {tallasPropias.map((tOpt) => (
        <button key={tOpt} type="button" onClick={() => onSelectTalla(tOpt)}
          className="min-w-[2.25rem] h-9 px-2 rounded-lg border text-sm font-medium transition-colors"
          style={tallaSeleccionada === tOpt
            ? { backgroundColor: '#e8e8ed', color: '#0d0d12', borderColor: '#e8e8ed' }
            : { backgroundColor: 'transparent', color: '#e8e8ed', borderColor: 'rgba(255,255,255,0.2)' }}>
          {tOpt}
        </button>
      ))}
      {[...hermanasPorTalla.entries()].map(([tOpt, v]) => (
        <button key={v.id} type="button" onClick={() => onNavigate(`/productos/${v.id}`)}
          className="min-w-[2.25rem] h-9 px-2 rounded-lg border text-sm font-medium transition-colors"
          style={{ backgroundColor: 'transparent', color: '#e8e8ed', borderColor: 'rgba(255,255,255,0.2)' }}>
          {tOpt}
        </button>
      ))}
    </div>
  )
}
