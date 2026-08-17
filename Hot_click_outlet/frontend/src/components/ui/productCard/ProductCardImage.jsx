import { useTranslation } from 'react-i18next'
import { conditionLabel } from '@/utils/format'
import OptimizedImage from '@/components/ui/OptimizedImage'

const CONDICION_STYLES = {
  NUEVO:     { background: 'var(--hc-success-bg)', color: 'var(--hc-success)', border: '1px solid color-mix(in srgb, var(--hc-success) 30%, transparent)' },
  COMO_NUEVO:{ background: 'var(--hc-info-bg)',    color: 'var(--hc-info)',    border: '1px solid color-mix(in srgb, var(--hc-info) 30%, transparent)' },
}
const CONDICION_DEFAULT = { background: 'var(--hc-warning-bg)', color: 'var(--hc-warning)', border: '1px solid color-mix(in srgb, var(--hc-warning) 30%, transparent)' }

export default function ProductCardImage({
  product,
  priority,
  imgError,
  setImgError,
  hotTag,
  liked,
  onToggleWishlist,
}) {
  const { t } = useTranslation()
  const condicionStyle = CONDICION_STYLES[product.condicion] ?? CONDICION_DEFAULT

  return (
    <div className="hc-product-img relative aspect-square flex items-center justify-center overflow-hidden">
      {product.imagenUrl && !imgError ? (
        <OptimizedImage
          src={product.imagenUrl}
          alt={product.nombre}
          width={400}
          height={400}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
          priority={priority}
          quality={80}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex flex-col items-center gap-3 opacity-20">
          <svg className="w-10 h-10" style={{ color: 'var(--hc-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span className="text-[11px] font-medium tracking-wide uppercase" style={{ color: 'var(--hc-muted)' }}>
            Sin imagen
          </span>
        </div>
      )}

      {product.stock === 0 && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(6,4,20,0.65)', backdropFilter: 'blur(2px)' }}
        >
          <span
            className="text-[11px] font-semibold text-white/90 px-3.5 py-1.5 rounded-full tracking-wide"
            style={{ background: 'rgba(12,8,32,0.72)', border: '1px solid rgba(255,255,255,0.14)' }}
          >
            {t('products.outOfStock')}
          </span>
        </div>
      )}

      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
        {hotTag && (
          <span
            className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md"
            style={{ background: 'var(--hc-red-500)', color: '#FFFFFF', fontFamily: 'var(--font-display)' }}
          >
            {hotTag}
          </span>
        )}
        {product.condicion && (
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
            style={condicionStyle}
          >
            {conditionLabel(product.condicion)}
          </span>
        )}
      </div>

      <button type="button"
        onClick={(e) => { e.stopPropagation(); onToggleWishlist(product) }}
        className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
        style={{
          background: liked ? 'rgba(239,68,68,0.22)' : 'rgba(0,0,0,0.42)',
          border: liked ? '1px solid rgba(239,68,68,0.48)' : '1px solid rgba(255,255,255,0.18)',
          backdropFilter: 'blur(10px)',
        }}
        aria-label={liked ? 'Quitar de favoritos' : 'Guardar en wishlist'}
      >
        <HeartCardIcon filled={liked} />
      </button>

    </div>
  )
}

function HeartCardIcon({ filled }) {
  return filled ? (
    <svg className="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  ) : (
    <svg className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.75)' }} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  )
}
