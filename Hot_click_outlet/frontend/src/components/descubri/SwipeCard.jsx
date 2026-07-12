import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '@/utils/format'
import SwipeShell from './SwipeShell'

export default function SwipeCard({ product, isTop, stackIndex, onSwipe }) {
  const { t } = useTranslation()

  const precioFinal = product.enOferta && product.precioOferta
    ? product.precioOferta
    : product.precio

  return (
    <SwipeShell
      isTop={isTop}
      stackIndex={stackIndex}
      onSwipe={onSwipe}
      stamps={{ like: t('descubri.stampLike'), skip: t('descubri.stampSkip') }}
    >
      {/* Zona de imagen: fondo blanco fijo — las fotos de catálogo son fondo blanco */}
      <div className="relative flex-1 min-h-0 bg-white flex items-center justify-center p-6">
        <img
          src={product.imagenUrl}
          alt={product.nombre}
          className="max-w-full max-h-full object-contain pointer-events-none"
          draggable={false}
          loading={stackIndex === 0 ? 'eager' : 'lazy'}
        />

        {/* Badge de emprendimiento → lleva a su tienda pública */}
        {product.empresaSlug && (
          <Link
            to={`/tienda/${product.empresaSlug}`}
            onPointerDownCapture={(e) => e.stopPropagation()}
            className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-semibold max-w-[70%] truncate"
            style={{ background: 'var(--hc-accent)', color: 'white' }}
          >
            {t('descubri.deEmprendimiento', { nombre: product.empresaNombre })}
          </Link>
        )}

        {product.enOferta && product.porcentajeDescuento > 0 && (
          <span
            className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-bold text-white"
            style={{ background: 'var(--hc-danger)' }}
          >
            -{product.porcentajeDescuento}%
          </span>
        )}
      </div>

      {/* Info del producto */}
      <div className="px-4 pt-3 pb-4" style={{ borderTop: '1px solid var(--hc-border)' }}>
        <div className="flex items-center gap-2 mb-1 min-h-[18px]">
          {product.marcaNombre && (
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--hc-accent)' }}>
              {product.marcaNombre}
            </span>
          )}
          {product.categoriaNombre && (
            <span className="text-[11px]" style={{ color: 'var(--hc-muted)' }}>
              {product.categoriaNombre}
            </span>
          )}
        </div>
        <h2 className="font-semibold text-base leading-snug line-clamp-2" style={{ color: 'var(--hc-text)' }}>
          {product.nombre}
        </h2>
        <div className="flex items-baseline gap-2 mt-1.5">
          <span className="text-xl font-bold" style={{ color: 'var(--hc-text)' }}>
            {formatPrice(precioFinal)}
          </span>
          {product.enOferta && product.precioOferta && (
            <span className="text-sm line-through" style={{ color: 'var(--hc-muted)' }}>
              {formatPrice(product.precio)}
            </span>
          )}
          {product.stock > 0 && product.stock <= 3 && (
            <span className="ml-auto text-xs font-medium" style={{ color: 'var(--hc-warning)' }}>
              {t('descubri.lowStock', { count: product.stock })}
            </span>
          )}
        </div>
      </div>
    </SwipeShell>
  )
}
