import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatPrice, conditionLabel, conditionVariant } from '@/utils/format'
import Badge from '@/components/ui/Badge'

export default function QuickViewInfo({ product, inStock, onClose, children }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <>
      <button
        type="button"
        className="w-full md:w-56 h-52 md:h-auto bg-[#111114] shrink-0 flex items-center justify-center overflow-hidden"
        onClick={() => { onClose(); navigate(`/productos/${product.id}`) }}
      >
        {product.imagenUrl ? (
          <img src={product.imagenUrl} alt={product.nombre} className="w-full h-full object-cover" />
        ) : (
          <span className="text-6xl opacity-20">📦</span>
        )}
      </button>

      <div className="flex-1 p-5 md:p-6 flex flex-col gap-3.5 overflow-y-auto">
        <div className="flex items-start gap-3">
          <div className="flex-1 space-y-1.5">
            {product.condicion && (
              <Badge variant={conditionVariant(product.condicion)}>
                {conditionLabel(product.condicion)}
              </Badge>
            )}
            <h3 className="font-bold text-base leading-snug" style={{ color: 'var(--hc-text)' }}>
              {product.titulo || product.nombre}
            </h3>
          </div>
          <button type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl transition-colors shrink-0 hover:bg-white/8"
            style={{ color: 'var(--hc-muted)' }}
            aria-label={t('quickView.close')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-[#e8e8ed]">{formatPrice(product.precio)}</span>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${inStock ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <span className={`text-xs font-medium ${inStock ? 'text-emerald-400' : 'text-red-400'}`}>
              {inStock ? t('quickView.available', { count: product.stock }) : t('quickView.outOfStock')}
            </span>
          </div>
        </div>

        {product.descripcion && (
          <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'var(--hc-muted)' }}>
            {product.descripcion}
          </p>
        )}

        {children}
      </div>
    </>
  )
}
